//ОСНОВНАЯ ЧАСТЬ
let canvas = document.getElementById("canvas");

let engine = new BABYLON.Engine(canvas);

let scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color3(0.7, 0.7, 0.7);
scene.createDefaultEnvironment({
    createSkybox: false,
    createGround: false,
    cameraContrast: 2.5,
    cameraExposure: 1,
});

let skybox = new BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000 }, scene);
let skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(
    "assets/environment/TropicalSunnyDay",
    scene
);
skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
skyboxMaterial.backFaceCulling = false;
skybox.material = skyboxMaterial;

let camera = new BABYLON.FreeCamera(
    "camera",
    new BABYLON.Vector3(0, 3, -14),
    scene
);

let light = new BABYLON.PointLight(
    "light",
    new BABYLON.Vector3(10, 10, 0),
    scene
);
light.intensity = 0.15;

let shadowGenerator = new BABYLON.ShadowGenerator(1024, light);

// ПЕРЕМЕННЫЕ СТАТУС ИГРЫ
let inMove = false;
let gameOver = false;
let score = 0;
let nowscore = 0;
let loaded = false;
let onShop = false;

//ИЗВЛЕЧЕНИЕ
let scoreInfor = document.getElementById("scoreInfor");
let gameOverScreen = document.getElementById("gameOver");
let restart = document.getElementById("restart");
let nowScore = document.getElementById("nowScore");
let bestscoreinfo = document.getElementById("bestscoreinfo");
let loadscreen = document.getElementById("loadscreen");
let shopIcon = document.getElementById("shop-icon");
let backIcon = document.getElementById("back-icon");
let shopScreen = document.getElementById("shop-screen");
let priceBlock = document.getElementById("price-block");
//ИГРОВЫЕ ОБЪЕКТЫ
let platformArray = [];

const creatPlatform = (zPos) => {
    let platform = new BABYLON.MeshBuilder.CreateBox(
        "box",
        {
            width: 12,
            height: 0.1,
            depth: 12,
            wrap: true,
        },
        scene
    );
    platform.position.z = zPos;
    let platformMaterial = new BABYLON.StandardMaterial("material", scene);
    platformMaterial.emissiveTexture = new BABYLON.Texture(
        "assets/textures/road.jpg"
    );
    platform.material = platformMaterial;
    platform.receiveShadows = true;
    platform.physicsImpostor = new BABYLON.PhysicsImpostor(
        platform,
        BABYLON.PhysicsImpostor.BoxImpostor,
        {
            mass: 0,
        },
        scene
    );
    platformArray.push(platform);
};

let coinArray = [];
let colArray = [];
let coin = null;
const createCoin = (pos) => {
    let collissionMesh = new BABYLON.MeshBuilder.CreateBox(
        "colBox",
        { size: 1 },
        scene
    );
    collissionMesh.hasVertexAlpha = true;
    collissionMesh.visibility = 0;
    collissionMesh.position = pos;
    BABYLON.SceneLoader.ImportMesh(
        null,
        "assets/models/",
        "coin.glb",
        scene,
        (meshArray) => {
            coin = meshArray[0];
            shadowGenerator.addShadowCaster(coin);
            coin.receiveShadows = true;
            coin.parent = collissionMesh;
            coinArray.push(coin);
        }
    );
    colArray.push(collissionMesh);
};

let coneArray = [];
const createCone = (xPos, zPos) => {
    let cone = new BABYLON.MeshBuilder.CreateCylinder(
        "cone",
        {
            diameterBottom: 1.2,
            diameterTop: 0.2,
        },
        scene
    );
    cone.position = new BABYLON.Vector3(xPos, 1, zPos + 5);
    cone.material = new BABYLON.StandardMaterial("material", scene);
    cone.material.emissiveColor = new BABYLON.Color3(1, 0.5, 0);

    cone.physicsImpostor = new BABYLON.PhysicsImpostor(
        cone,
        BABYLON.PhysicsImpostor.CylinderImpostor,
        {
            mass: 2,
            restitution: 1,
        },
        scene
    );
    shadowGenerator.getShadowMap().renderList.push(cone);
    cone.receiveShadows = true;
    coneArray.push(cone);
};
let lastRand = null;
let pointArray = [];
const createConeRow =  (zPos) => {
    let rand = Math.floor(Math.random() * 3);
    while (rand === lastRand) {
        rand = Math.floor(Math.random() * 3);
    }
    lastRand = rand;
    for (let i = 0; i < 3; i++) {
        if (i === rand) {
            createCoin(new BABYLON.Vector3(i * 2 - 2, 1, zPos + 5));
            pointArray.push(new BABYLON.Vector3(i * 2 - 2, 0.2, zPos + 5));
            continue;
        }
        createCone(i * 2 - 2, zPos);
    }
};
let speed = 20;
const createCar = (needP = true) => {
    let box = new BABYLON.MeshBuilder.CreateBox("box", {
        width: 1.1,
        height: 0.8,
        depth: 3,
    });
    box.position = new BABYLON.Vector3(0, 1, 0);
    box.material = new BABYLON.StandardMaterial("material", scene);
    box.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
    if (needP) {
        box.physicsImpostor = new BABYLON.PhysicsImpostor(
            box,
            BABYLON.PhysicsImpostor.BoxImpostor,
            {
                mass: 1,
                restitution: 0,
                friction: 0,
            },
            scene
        );
    }
    box.hasVertexAlpha = true;
    box.visibility = 0;
    BABYLON.SceneLoader.ImportMesh(
        "",
        "assets/models/",
        "car0.glb",
        scene,
        (meshes) => {
            let car = meshes[0];

            car.parent = box;
            car.position = new BABYLON.Vector3(0, -0.5, -0.3);
            car.rotation = new BABYLON.Vector3(0, Math.PI * 2, 0);
            shadowGenerator.addShadowCaster(car);
            if (!onShop && coinArray.length > 8) shopIcon.style.display = 'block';
            if (onShop) {backIcon.style.display = 'block'}
        }
    );


    return box;
};

//ФУНКЦИИ ИГРЫ
let demoArray = [];
let demoTimer;
const createDemoObjects = () => {
    let box = createCar(false);
    box.position = new BABYLON.Vector3(0, 6, 0);
    box.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
    box.rotation.y += BABYLON.Tools.ToRadians(135);
    demoArray.push(box);
    demoTimer = setInterval(() => {
        box.rotate(
            new BABYLON.Vector3(0, 1, 0),
            Math.PI * (engine.getDeltaTime() / 1000),
            BABYLON.Space.WORLD
        );
    }, 20);
};

const deleteDemoObjects = () => {
    box.dispose();
    clearArray(demoArray);
    clearInterval(demoTimer);
};

const saveBestScore = () => {
    window.localStorage.setItem("Bestscore", nowscore);
};

const loadBestScore = () => {
    return window.localStorage.getItem("Bestscore")
        ? window.localStorage.getItem("Bestscore")
        : 0;
};

const setGameOverScreen = () => {
    gameOverScreen.style.display = "block";
    let Bestscore = loadBestScore();
    if (nowscore > Bestscore) {
        saveBestScore();
        Bestscore = nowscore;
        bestscoreinfo.style.color = "blue";
        nowScore.style.color = "blue";
    }
    bestscoreinfo.textContent = `BEST: ${Bestscore}`;
    nowScore.textContent = `NOW: ${nowscore}`;
};

const saveCoinScore = () => {
    window.localStorage.setItem("score", score);
};

const loadCoinScore = () => {
    score = window.localStorage.getItem("score");
    scoreInfor.textContent = score;
    if (window.localStorage.getItem("score") === null) {
        scoreInfor.textContent = 0;
    }
};

const newRoadBlock = (zPos) => {
    creatPlatform(zPos);
    createConeRow(zPos);
};

let box = null;
const clearArray = (array, isMesh = true) => {
    if (isMesh) array.forEach((elem) => elem.dispose());
    while (array.length) array.pop();
};
const deleteGameObjects = () => {
    box.dispose();
    clearArray(platformArray);
    clearArray(coinArray);
    clearArray(coneArray);
    clearArray(colArray);
    clearArray(pointArray, false);
};

const createGameObjects =  () => {
    for (let i = 0; i < 10; i++) {
        creatPlatform(i * 12);
        if (i === 0) continue;
        createConeRow(i * 12);
    }
    box = createCar();
};

const restartGame = () => {
    gameOverScreen.style.display = "none";
    bestscoreinfo.style.color = "gray";
    nowScore.style.color = "gray";
    deleteGameObjects();
    createGameObjects()
        gameOver = false;
        inMove = false;
        skybox.position = new BABYLON.Vector3.Zero();
        nowscore = 0;
        speed = 20;
        shopIcon.style.opacity = "1";
};
//ОБРАБОТЧИКИ

window.addEventListener("touchend", (event) => {
    if (loaded) {
        if (
            !inMove &&
            !gameOver &&
            event.changedTouches[0].screenY > 0.3 * window.screen.height &&
            !onShop
        ) {
            box.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 0, speed));
            inMove = true;
            shopIcon.style.opacity = "0.3";
            shopIcon.style
        } else if (inMove && !gameOver) {
            let touch = event.changedTouches[0];
            let x = touch.clientX;
            if (x < window.screen.width / 2) {
                box.translate(new BABYLON.Vector3(-2.4, 0, 0), 1, BABYLON.Space.WORLD);
                speed += speed * 0.01;
                if (box.getAbsolutePosition().x < -2.4) {
                    box.position.x = -2.4;
                }
            } else {
                box.translate(new BABYLON.Vector3(2.4, 0, 0), 1, BABYLON.Space.WORLD);
                speed += speed * 0.01;
                if (box.getAbsolutePosition().x > 2.4) {
                    box.position.x = 2.4;
                }
            }
        }
    }
});

window.addEventListener("keydown", (e) => {
    if (e.key === " " && !inMove && !gameOver && loaded && !onShop) {
        box.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 0, speed));
        inMove = true;
        shopIcon.style.opacity = "0.3";
    }
    if (e.key === "a" && inMove && !gameOver) {
        e.preventDefault();
        box.translate(new BABYLON.Vector3(-2.4, 0, 0), 1, BABYLON.Space.WORLD);
        speed += speed * 0.01;
        box.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 0, speed));
        if (box.getAbsolutePosition().x < -2.4) {
            box.position.x = -2.4;
        }
    }
    if (e.key === "d" && inMove && !gameOver) {
        e.preventDefault();
        box.translate(new BABYLON.Vector3(2.4, 0, 0), 1, BABYLON.Space.WORLD);
        speed += speed * 0.01;
        box.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, 0, speed));
        if (box.getAbsolutePosition().x > 2.4) {
            box.position.x = 2.4;
        }
    }
    if (e.key === "Enter" && gameOver) {
        restartGame();
    }
});

window.addEventListener("load", () => {
    setTimeout(() => {
        loadscreen.style.display = "none";
        loaded = true;
    }, 2000);
});

shopIcon.addEventListener("click", () => {
    if (!inMove && !gameOver) {
        onShop = true;
        deleteGameObjects();
        createDemoObjects();
        shopIcon.style.display = "none";
        priceBlock.style.display = "block";
        shopScreen.style.display = "flex";
    }
});

backIcon.addEventListener("click", () => {
    deleteDemoObjects();
    createGameObjects();
    onShop = false;
    backIcon.style.display = "none";
    priceBlock.style.display = "none";
    shopScreen.style.display = "none";
});

restart.addEventListener("click", restartGame);

loadCoinScore();
scene.registerBeforeRender(() => {
    if (!gameOver && !onShop) { box.physicsImpostor.setAngularVelocity(new BABYLON.Vector3.Zero()); }
    if (box.getAbsolutePosition().z > 420)
        skybox.position.z = box.getAbsolutePosition().z - 420;
    light.position.z = box.getAbsolutePosition().z;
    camera.position.z = box.getAbsolutePosition().z - 19;
    camera.position.y = box.getAbsolutePosition().y + 5;
    if (gameOver) camera.position.x = box.getAbsolutePosition().x;
    else {
        camera.position.x = 0;
    }
    if (box.getAbsolutePosition().y < -500) {
        restartGame();
    }
    for (let i = 0; i < coneArray.length; i++) {
        if (box.intersectsMesh(coneArray[i])) {
            gameOver = true;
            inMove = false;
            setGameOverScreen();
        }
    }
    for (let i = 0; i < colArray.length; i++) {
        if (!onShop && box.intersectsMesh(colArray[i])) {
            coinArray[i].dispose();
            coinArray.slice(i, 1);
            colArray[i].dispose();
            colArray.splice(i, 1);
            if (!gameOver) score++;
            scoreInfor.textContent = score;
            saveCoinScore();
        }
    }

    for (let i = 0; i < pointArray.length; i++) {
        if (box.intersectsPoint(pointArray[i])) {
            pointArray.splice(i, 1);
            if (!gameOver) nowscore++;
            if (pointArray.length < 9 && !gameOver) {
                newRoadBlock(pointArray[pointArray.length - 1].z + 7);
            }
        }
    }

    for (let i = 0; i < platformArray.length; i++) {
        if (box.intersectsMesh(platformArray[i]) && i > 3) {
            platformArray[i - 4].dispose();
            platformArray.splice(i - 4, 1);
            coneArray[0].dispose();
            coneArray[1].dispose();
            coneArray.splice(0, 2);
        }
    }
});
// ПРИЗЫВАЮ ФИЗИКУ И ВСЕ ЧТО СОЗДАЕТСЯ

Ammo().then(() => {
    const physicsPlugin = new BABYLON.AmmoJSPlugin();
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);

    createGameObjects()
        engine.runRenderLoop(() => {
            scene.render();
        });
   
});
