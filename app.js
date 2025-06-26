import * as THREE from './libs/three/three.module.js';
import { GLTFLoader } from './libs/three/jsm/GLTFLoader.js';
import { DRACOLoader } from './libs/three/jsm/DRACOLoader.js';
import { RGBELoader } from './libs/three/jsm/RGBELoader.js'; // keep this for HDR
import { Stats } from './libs/stats.module.js';
import { LoadingBar } from './libs/LoadingBar.js';
import { VRButton } from './libs/VRButton.js';
import { CanvasUI } from './libs/CanvasUI.js';
import { GazeController } from './libs/GazeController.js'
import { XRControllerModelFactory } from './libs/three/jsm/XRControllerModelFactory.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

		this.assetsPath = './assets/';
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 500 );
		this.camera.position.set( 0, 1.6, 0 );
        
        this.dolly = new THREE.Object3D();
        this.dolly.position.set(0, 0, 10);
        this.dolly.add(this.camera);
        this.dummyCam = new THREE.Object3D();
        this.camera.add(this.dummyCam);
        
		this.scene = new THREE.Scene();
        this.scene.add(this.dolly);

		// ✅ Audio setup
		this.listener = new THREE.AudioListener(); 
		this.camera.add(this.listener); 
		this.sound = new THREE.Audio(this.listener); 
		const audioLoader = new THREE.AudioLoader();
		audioLoader.load('./assets/bg-music.mp3', (buffer) => {
			this.sound.setBuffer(buffer);
			this.sound.setLoop(true);
			this.sound.setVolume(0.5);
		});
		document.body.addEventListener('click', () => {
			if (this.sound && this.sound.buffer && !this.sound.isPlaying) {
				this.sound.play();
			}
		}, { once: true });

		// 🌤️ Soft white ambient light (sky and ground both white-ish)
this.ambientLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.01);
this.scene.add(this.ambientLight);

		// ✅ Directional light pointing straight down
this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
this.directionalLight.position.set(0, 10, 0); // directly above the scene
this.directionalLight.target.position.set(0, 0, 0); // point downward to the origin
this.scene.add(this.directionalLight);
this.scene.add(this.directionalLight.target); // must add the target to the scene
this.directionalLight.castShadow = true;
this.directionalLight.shadow.bias = -0.001;
this.directionalLight.shadow.radius = 4;
this.directionalLight.shadow.mapSize.width = 1024;
this.directionalLight.shadow.mapSize.height = 1024;
		
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild(this.renderer.domElement);

		// ✅ Realistic skybox environment
		this.setEnvironment();

		window.addEventListener('resize', this.resize.bind(this));
        
        this.clock = new THREE.Clock();
        this.up = new THREE.Vector3(0,1,0);
        this.origin = new THREE.Vector3();
        this.workingVec3 = new THREE.Vector3();
        this.workingQuaternion = new THREE.Quaternion();
        this.raycaster = new THREE.Raycaster();
        
        this.stats = new Stats();
		container.appendChild(this.stats.dom);
        
		this.loadingBar = new LoadingBar();
		
		this.loadCollege();
        
        this.immersive = false;
        
        const self = this;
        
        fetch('./college.json')
            .then(response => response.json())
            .then(obj =>{
                self.boardShown = '';
                self.boardData = obj;
            });
	}

	// ✅ HDR sky environment (night sky)
	setEnvironment() {
    const loader = new RGBELoader().setPath(this.assetsPath);

    loader.load('hansaplatz_2k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        this.scene.background = texture;    // Set the scene's background to the HDR texture
        this.scene.environment = null;  // Use HDR for reflective lighting too

        console.log("✅ HDR skybox 'hansaplatz_2k.hdr' loaded successfully");
    }, undefined, (err) => {
        console.error("❌ Failed to load HDR environment:", err);
    });
}
    
	resize(){
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);  
	}

	loadCollege(){
		const loader = new GLTFLoader().setPath(this.assetsPath);
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('./libs/three/js/draco/');
		loader.setDRACOLoader(dracoLoader);

		const self = this;

		loader.load(
			'college.glb',
			function (gltf) {
				const college = gltf.scene.children[0];
				self.scene.add(college);

				// ✅ Load Godzilla model
				loader.load(
					'godzilla.glb',
					function (gltf2) {
						const godzilla = gltf2.scene;
						godzilla.name = "Godzilla";
						godzilla.position.set(2, 0, 9);
						godzilla.scale.set(3, 3, 3);
						self.scene.add(godzilla);
						console.log("✅ Godzilla loaded", godzilla);
					},
					undefined,
					function (error) {
						console.error('❌ Error loading Godzilla model:', error);
					}
				);

				college.traverse((child) => {
    if (!child.isMesh) return;

    // 🌈 Collect wall meshes (broad match)
    self.wallMeshes = self.wallMeshes || [];
    const mat = child.material;
    if (mat && mat.isMeshStandardMaterial && !child.name.includes("Glass")) {
        self.wallMeshes.push(child);
    }

    const oldMat = child.material;

    // Replace MeshBasicMaterial (unlit) with standard material
    if (oldMat instanceof THREE.MeshBasicMaterial || !oldMat.isMeshStandardMaterial) {
        child.material = new THREE.MeshStandardMaterial({
            color: oldMat.color || new THREE.Color(0xffffff),
            map: oldMat.map || null,
            metalness: 0.2,
            roughness: 0.8,
            transparent: oldMat.transparent || false,
            opacity: oldMat.opacity !== undefined ? oldMat.opacity : 1.0,
            envMap: null
        });
    }

    // Strip lightMap and emissive
    if (child.material.lightMap) child.material.lightMap = null;
    if (child.material.emissive) child.material.emissive.set(0x000000);
    if (child.material.envMap) child.material.envMap = null;

    // Fix proxy, glass, skybox behavior
    if (child.name.includes("PROXY")) {
        child.material.visible = false;
        self.proxy = child;
    } else if (child.material.name && child.material.name.includes("Glass")) {
        child.material.opacity = 0.1;
        child.material.transparent = true;
    } else if (child.material.name && child.material.name.includes("SkyBox")) {
        child.material.dispose();
        child.material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide
        });
    }

    // Optional: Fix normals
    if (child.geometry) {
        child.geometry.computeVertexNormals();
    }
});

console.log("🌈 Wall meshes collected:", self.wallMeshes.length);

				const door1 = college.getObjectByName("LobbyShop_Door__1_");
				const door2 = college.getObjectByName("LobbyShop_Door__2_");
				const pos = door1.position.clone().sub(door2.position).multiplyScalar(0.5).add(door2.position);
				const obj = new THREE.Object3D();
				obj.name = "LobbyShop";
				obj.position.copy(pos);
				college.add(obj);

				self.loadingBar.visible = false;
				self.setupXR();
			},
			function (xhr) {
				self.loadingBar.progress = (xhr.loaded / xhr.total);
			},
			function (error) {
				console.log('An error happened');
			}
		);
	}
    
    setupXR(){
        this.renderer.xr.enabled = true;

        const btn = new VRButton( this.renderer );
        
        const self = this;
        
        const timeoutId = setTimeout( connectionTimeout, 2000 );
        
        function onSelectStart( event ) {
        
            this.userData.selectPressed = true;
        
        }

        function onSelectEnd( event ) {
        
            this.userData.selectPressed = false;
        
        }
        
        function onConnected( event ){
            clearTimeout( timeoutId );
        }
        
        function connectionTimeout(){
            self.useGaze = true;
            self.gazeController = new GazeController( self.scene, self.dummyCam );
        }
        
        this.controllers = this.buildControllers( this.dolly );
        
        this.controllers.forEach( ( controller ) =>{
            controller.addEventListener( 'selectstart', onSelectStart );
            controller.addEventListener( 'selectend', onSelectEnd );
            controller.addEventListener( 'connected', onConnected );
        });
        
        const config = {
            panelSize: { height: 0.5 },
            height: 256,
            name: { fontSize: 50, height: 70 },
            info: { position:{ top: 70, backgroundColor: "#ccc", fontColor:"#000" } }
        }
        const content = {
            name: "name",
            info: "info"
        }
        
        this.ui = new CanvasUI( content, config );
        this.scene.add( this.ui.mesh );
        
        this.renderer.setAnimationLoop( this.render.bind(this) );
    }
    
    buildControllers( parent = this.scene ){
        const controllerModelFactory = new XRControllerModelFactory();

        const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 ) ] );

        const line = new THREE.Line( geometry );
        line.scale.z = 0;
        
        const controllers = [];
        
        for(let i=0; i<=1; i++){
            const controller = this.renderer.xr.getController( i );
            controller.add( line.clone() );
            controller.userData.selectPressed = false;
            parent.add( controller );
            controllers.push( controller );
            
            const grip = this.renderer.xr.getControllerGrip( i );
            grip.add( controllerModelFactory.createControllerModel( grip ) );
            parent.add( grip );
        }
        
        return controllers;
    }
    
    moveDolly(dt){
        if (this.proxy === undefined) return;
        
        const wallLimit = 1.3;
        const speed = 2;
		let pos = this.dolly.position.clone();
        pos.y += 1;
        
		let dir = new THREE.Vector3();
        //Store original dolly rotation
        const quaternion = this.dolly.quaternion.clone();
        //Get rotation for movement from the headset pose
        this.dolly.quaternion.copy( this.dummyCam.getWorldQuaternion(this.workingQuaternion) );
		this.dolly.getWorldDirection(dir);
        dir.negate();
		this.raycaster.set(pos, dir);
		
        let blocked = false;
		
		let intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            if (intersect[0].distance < wallLimit) blocked = true;
        }
		
		if (!blocked){
            this.dolly.translateZ(-dt*speed);
            pos = this.dolly.getWorldPosition( this.origin );
		}
		
        //cast left
        dir.set(-1,0,0);
        dir.applyMatrix4(this.dolly.matrix);
        dir.normalize();
        this.raycaster.set(pos, dir);

        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            if (intersect[0].distance<wallLimit) this.dolly.translateX(wallLimit-intersect[0].distance);
        }

        //cast right
        dir.set(1,0,0);
        dir.applyMatrix4(this.dolly.matrix);
        dir.normalize();
        this.raycaster.set(pos, dir);

        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            if (intersect[0].distance<wallLimit) this.dolly.translateX(intersect[0].distance-wallLimit);
        }

        //cast down
        dir.set(0,-1,0);
        pos.y += 1.5;
        this.raycaster.set(pos, dir);
        
        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            this.dolly.position.copy( intersect[0].point );
        }

        //Restore the original rotation
        this.dolly.quaternion.copy( quaternion );
	}
		
    get selectPressed(){
        return ( this.controllers !== undefined && (this.controllers[0].userData.selectPressed || this.controllers[1].userData.selectPressed) );    
    }
    
    showInfoboard( name, info, pos ){
        if (this.ui === undefined ) return;
        this.ui.position.copy(pos).add( this.workingVec3.set( 0, 1.3, 0 ) );
        const camPos = this.dummyCam.getWorldPosition( this.workingVec3 );
        this.ui.updateElement( 'name', info.name );
        this.ui.updateElement( 'info', info.info );
        this.ui.update();
        this.ui.lookAt( camPos )
        this.ui.visible = true;
        this.boardShown = name;
    }

	render(timestamp, frame){
    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    const hue = (elapsed * 10 % 360) / 360;

    // ✅ Animate directional light with rainbow hue
    this.directionalLight.color.setHSL(hue, 1, 0.6);

    if (this.renderer.xr.isPresenting){
        let moveGaze = false;

        if (this.useGaze && this.gazeController !== undefined){
            this.gazeController.update();
            moveGaze = (this.gazeController.mode == GazeController.Modes.MOVE);
        }

        if (this.selectPressed || moveGaze){
            this.moveDolly(dt);

            if (this.boardData){
                const scene = this.scene;
                const dollyPos = this.dolly.getWorldPosition(new THREE.Vector3());
                let boardFound = false;

                Object.entries(this.boardData).forEach(([name, info]) => {
                    const obj = scene.getObjectByName(name);
                    if (obj !== undefined){
                        const pos = obj.getWorldPosition(new THREE.Vector3());
                        if (dollyPos.distanceTo(pos) < 3){
                            boardFound = true;
                            if (this.boardShown !== name) this.showInfoboard(name, info, pos);
                        }
                    }
                });

                if (!boardFound){
                    this.boardShown = "";
                    this.ui.visible = false;
                }
            }
        }
    }

    if (this.immersive != this.renderer.xr.isPresenting){
        this.resize();
        this.immersive = this.renderer.xr.isPresenting;
    }

    this.stats.update();
    this.renderer.render(this.scene, this.camera);
}
}

export { App };
