/**
 * Based on: LockPointerControls.js
 * @author queezythegreat
 */

THREE.FPSControls = function ( camera ) {
	var scope = this;

    // TODO: Add crouch support
    //       Add strafe support
    this.has_ground = true;
    this.ground_offset = 10;
    this.wall_offset = 20;
    this.collision_detection = true;

    this.movement_speed = 0.12;       // Movement speed
    this.mouse_sensitivity = 0.002;   // Mouse movement speed
    this.field_of_view = Math.PI/2;   // Field of View up and down  (in radians)
    this.gravity = 10;

	this.enabled = false;

	var pitchObject = new THREE.Object3D();
	pitchObject.add(camera);

	var yawObject = new THREE.Object3D();
	yawObject.position.y = this.ground_offset;
	yawObject.add(pitchObject);

    this.key_mapping = {
        forward:  [38 /** up    **/, 87 /** w **/],
        left:     [37 /** left  **/, 65 /** a **/],
        right:    [39 /** right **/, 68 /** d **/],
        backward: [40 /** down  **/, 83 /** s **/],
        jump:     [32 /** space **/],
    };
    this.objects = []; // List of meshes used for collision detection

	var moveForward = false;
	var moveBackward = false;
	var moveLeft = false;
	var moveRight = false;

	var maxMoveForward = this.wall_offset;
	var maxMoveBackward = this.wall_offset;
	var maxMoveLeft =  this.wall_offset;
	var maxMoveRight = this.wall_offset;

    var direction_change = false;

	var isOnObject = false;
	var canJump = false;

	var velocity = new THREE.Vector3();
    var y_axis = new THREE.Vector3(0, 1, 0);

    var collision_rays = {
        up:       new THREE.Raycaster(yawObject.position, new THREE.Vector3( 0,  1,  0)),
        down:     new THREE.Raycaster(yawObject.position, new THREE.Vector3( 0, -1,  0)),
        forward:  new THREE.Raycaster(yawObject.position, new THREE.Vector3( 0,  0, -1)),
        left:     new THREE.Raycaster(yawObject.position, new THREE.Vector3(-1,  0,  0)),
        right:    new THREE.Raycaster(yawObject.position, new THREE.Vector3( 1,  0,  0)),
        backward: new THREE.Raycaster(yawObject.position, new THREE.Vector3( 0,  0,  1)),
    };

    this.setup_pointer_lock = function (blocker_id, instructions_id) {
        var blocker = document.createElement("div");
        blocker.setAttribute('id', blocker_id);
        var instructions = document.createElement("div");
        instructions.setAttribute('id', instructions_id);
        instructions.innerHTML = '<span style="font-size:40px">Click to play</span>(W, A, S, D = Move, SPACE = Jump, MOUSE = Look around)'

        blocker.appendChild(instructions);
        document.body.appendChild(blocker);

        // http://www.html5rocks.com/en/tutorials/pointerlock/intro/

        var havePointerLock = 'pointerLockElement'       in document ||
                              'mozPointerLockElement'    in document ||
                              'webkitPointerLockElement' in document;

        if (havePointerLock) {
            var element = document.body;

            var pointerlockchange = function ( event ) {
                if (document.pointerLockElement       === element ||
                    document.mozPointerLockElement    === element ||
                    document.webkitPointerLockElement === element ) {

                    controls.enabled = true;

                    blocker.style.display = 'none';
                } else {
                    controls.enabled = false;

                    blocker.style.display = '-webkit-box';
                    blocker.style.display = '-moz-box';
                    blocker.style.display = 'box';

                    instructions.style.display = '';
                }
            }

            var pointerlockerror = function ( event ) {
                instructions.style.display = '';
            }

            // Hook pointer lock state change events
            document.addEventListener('pointerlockchange',       pointerlockchange, false);
            document.addEventListener('mozpointerlockchange',    pointerlockchange, false);
            document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

            document.addEventListener('pointerlockerror',        pointerlockerror, false);
            document.addEventListener('mozpointerlockerror',     pointerlockerror, false);
            document.addEventListener('webkitpointerlockerror',  pointerlockerror, false);

            instructions.addEventListener( 'click', function ( event ) {
                instructions.style.display = 'none';

                // Ask the browser to lock the pointer
                element.requestPointerLock = element.requestPointerLock    ||
                                             element.mozRequestPointerLock ||
                                             element.webkitRequestPointerLock;

                if ( /Firefox/i.test( navigator.userAgent ) ) {
                    var fullscreenchange = function (event) {
                        if (document.fullscreenElement    === element ||
                            document.mozFullscreenElement === element ||
                            document.mozFullScreenElement === element ) {

                            document.removeEventListener('fullscreenchange',    fullscreenchange);
                            document.removeEventListener('mozfullscreenchange', fullscreenchange);

                            element.requestPointerLock();
                        }
                    }
                    document.addEventListener('fullscreenchange',    fullscreenchange, false);
                    document.addEventListener('mozfullscreenchange', fullscreenchange, false);

                    element.requestFullscreen = element.requestFullscreen    ||
                                                element.mozRequestFullscreen ||
                                                element.mozRequestFullScreen ||
                                                element.webkitRequestFullscreen;

                    element.requestFullscreen();
                } else {
                    element.requestPointerLock();
                }
            }, false );
        } else {
            instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
        }
    }

    function update_collision_rays(angle) {
        rotate_vector(collision_rays.forward.ray.direction,  y_axis,  angle);
        rotate_vector(collision_rays.left.ray.direction,     y_axis,  angle);
        rotate_vector(collision_rays.right.ray.direction,    y_axis,  angle);
        rotate_vector(collision_rays.backward.ray.direction, y_axis,  angle);
    }

    function get_intersect(objects, ray) {
        var intersections = ray.intersectObjects(objects);
        if (intersections.length > 0) {
          return intersections[0].distance;
        }
        return 0;
    }

    function does_intersect(objects, ray, min, max) {
        var intersections = ray.intersectObjects(objects);
        if (intersections.length > 0) {
          var distance = intersections[0].distance;
          if (distance > min && distance < max)
              return true; 
        }
        return false;
    }

    function rotate_vector(vector, axis, angle) {
        var matrix = new THREE.Matrix4().makeRotationAxis(axis, angle);

        vector.applyMatrix4(matrix);
    }

	var onMouseMove = function ( event ) {
		if (scope.enabled === false)
            return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        var movement_x_delta = -(movementY * scope.mouse_sensitivity);
        var movement_y_delta = -(movementX * scope.mouse_sensitivity);

		yawObject.rotation.y += movement_y_delta;
		pitchObject.rotation.x += movement_x_delta;

        if (scope.collision_detection) {
            direction_change = true;
            update_collision_rays(movement_y_delta);
        }

		pitchObject.rotation.x = Math.max(-scope.field_of_view, Math.min(scope.field_of_view, pitchObject.rotation.x));
	};

	var onKeyDown = function (event) {
        if (scope.key_mapping.forward.indexOf(event.keyCode) > -1) {
            moveForward = true;
        } else if (scope.key_mapping.left.indexOf(event.keyCode) > -1) {
            moveLeft = true;
        } else if (scope.key_mapping.right.indexOf(event.keyCode) > -1) {
            moveRight = true;
        } else if (scope.key_mapping.backward.indexOf(event.keyCode) > -1) {
            moveBackward = true;
        } else if (scope.key_mapping.jump.indexOf(event.keyCode) > -1) {
            if (canJump === true)
                velocity.y += scope.gravity;
            canJump = false;
        }
        direction_change = true;
	};

	var onKeyUp = function ( event ) {
        if (scope.key_mapping.forward.indexOf(event.keyCode) > -1) {
            moveForward = false;
        } else if (scope.key_mapping.left.indexOf(event.keyCode) > -1) {
            moveLeft = false;
        } else if (scope.key_mapping.right.indexOf(event.keyCode) > -1) {
            moveRight = false;
        } else if (scope.key_mapping.backward.indexOf(event.keyCode) > -1) {
            moveBackward = false;
        }
        direction_change = true;
	};

	document.addEventListener('mousemove', onMouseMove, false);
	document.addEventListener('keydown',   onKeyDown,   false);
	document.addEventListener('keyup',     onKeyUp,     false);


	this.getObject = function () {
		return yawObject;
	};

    this.getPitch = function () {
        return pitchObject;
    };

	this.isOnObject = function ( boolean ) {
		isOnObject = boolean;
		canJump = boolean;
	};

    var count = 0;
	this.update = function ( delta ) {
        delta = delta * 1000;

		if (scope.enabled === false)
            return;


        if (scope.collision_detection) {
            //if (moveForward)
                canMoveForward  = !does_intersect(this.objects, collision_rays.forward, 0, scope.wall_offset);
            //if (moveLeft)
                canMoveLeft     = !does_intersect(this.objects, collision_rays.left, 0, scope.wall_offset);
            //if (moveRight)
                canMoveRight    = !does_intersect(this.objects, collision_rays.right, 0, scope.wall_offset);
            //if (moveBackward)
                canMoveBackward = !does_intersect(this.objects, collision_rays.backward, 0, scope.wall_offset);

            canMoveUp = get_intersect(this.objects, collision_rays.up);

            //if (!canJump)
                this.isOnObject(does_intersect(this.objects, collision_rays.down, 0, scope.ground_offset));
            direction_change = false;
        }

        //TODO: Fix velocity when collision 

		delta *= 0.1;

		velocity.x += ( - velocity.x ) * 0.08 * delta;
		velocity.z += ( - velocity.z ) * 0.08 * delta;


        var movement_delta =  scope.movement_speed * delta;
		if (moveForward  && canMoveForward) {
            velocity.z -= movement_delta;
        }
		if (moveBackward && canMoveBackward) {
            velocity.z += movement_delta;
        }

		if (moveLeft  && canMoveLeft) {
            velocity.x -= movement_delta;
        }
		if (moveRight && canMoveRight) {
            velocity.x += movement_delta;
        }

        velocity.y -= 0.25 * delta;
        
        if (canMoveUp > 0 && velocity.y > canMoveUp)
            velocity.y = canMoveUp-2
        //if (canMoveUp>0 && canMoveUp<10)
	    //		velocity.y = Math.max(velocity.y, yawObject.position.y+canMoveUp);


		if (isOnObject === true) {
			velocity.y = Math.max(0, velocity.y);
		}

		yawObject.translateX( velocity.x );
		yawObject.translateY( velocity.y ); 
		yawObject.translateZ( velocity.z );

		if (scope.has_ground && yawObject.position.y < 10 ) {
			velocity.y = 0;
			yawObject.position.y = scope.ground_offset;

			canJump = true;
		}
        count++;
	};
};
