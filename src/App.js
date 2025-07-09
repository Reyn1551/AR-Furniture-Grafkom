import "./App.css";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { XREstimatedLight } from "three/examples/jsm/webxr/XREstimatedLight";

function App() {
  let reticle;
  let hitTestSource = null;
  let hitTestSourceRequested = false;

  let scene, camera, renderer;

  let items = [
    {
      model: "./armchair.glb",
      scale: 0.01,
      info: {
        nama: "Kursi Santai",
        harga: "Rp 1.500.000",
        bahan: "Kayu dan Kain",
      },
    },
    {
      model: "./dylan_armchair_yolk_yellow.glb",
      scale: 0.01,
      info: {
        nama: "Kursi Dylan Kuning",
        harga: "Rp 2.000.000",
        bahan: "Kain Beludru",
      },
    },
    {
      model: "./marble_coffee_table.glb",
      scale: 0.01,
      info: {
        nama: "Meja Kopi Marmer",
        harga: "Rp 3.500.000",
        bahan: "Marmer dan Logam",
      },
    },
    {
      model: "./flippa_functional_coffee_table_w._storagewalnut.glb",
      scale: 0.01,
      info: {
        nama: "Meja Kopi Fungsional",
        harga: "Rp 2.800.000",
        bahan: "Kayu Walnut",
      },
    },
    {
      model: "./frame_armchairpetrol_velvet_with_gold_frame.glb",
      scale: 0.01,
      info: {
        nama: "Kursi Bingkai Emas",
        harga: "Rp 4.000.000",
        bahan: "Beludru dan Logam Emas",
      },
    },
    {
      model: "./elnaz_nesting_side_tables_brass__green_marble.glb",
      scale: 0.01,
      info: {
        nama: "Meja Samping Elnaz",
        harga: "Rp 2.200.000",
        bahan: "Marmer Hijau dan Kuningan",
      },
    },
  ];
  let loadedModels = [];
  let itemSelectedIndex = 0;

  let controller;

  init();
  setupFurnitureSelection();
  animate();

  function init() {
    let myCanvas = document.getElementById("canvas");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      70,
      myCanvas.innerWidth / myCanvas.innerHeight,
      0.01,
      20
    );

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    renderer = new THREE.WebGLRenderer({
      canvas: myCanvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(myCanvas.innerWidth, myCanvas.innerHeight);
    renderer.xr.enabled = true;

    // Don't add the XREstimatedLight to the scene initially
    // It doesn't have any estimated lighting values until an AR session starts
    const xrLight = new XREstimatedLight(renderer);
    xrLight.addEventListener("estimationstart", () => {
      // Swap the default light out for the estimated one so we start getting some estimated values.
      scene.add(xrLight);
      scene.remove(light);
      // The estimated lighting also provides an env cubemap which we apply here
      if (xrLight.environment) {
        scene.environment = xrLight.environment;
      }
    });

    xrLight.addEventListener("estimationend", () => {
      // Swap the lights back when we stop receiving estimated values
      scene.add(light);
      scene.remove(xrLight);

      // Revert back to the default environment
      // scene.environment =
    });

    let arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay", "light-estimation"],
      domOverlay: { root: document.body },
    });
    arButton.style.bottom = "20%";
    document.body.appendChild(arButton);

    for (let i = 0; i < items.length; i++) {
      const loader = new GLTFLoader();
      loader.load(items[i].model, function (glb) {
        let model = glb.scene;
        loadedModels[i] = model;
      });
    }

    controller = renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    scene.add(controller);

    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
  }

  function onSelect() {
    if (reticle.visible) {
      let newModel = loadedModels[itemSelectedIndex].clone();
      newModel.visible = true;
      reticle.matrix.decompose(
        newModel.position,
        newModel.quaternion,
        newModel.scale
      );
      let scaleFactor = items[itemSelectedIndex].scale;
      newModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
      scene.add(newModel);

      const info = items[itemSelectedIndex].info;
      const infoDiv = document.createElement("div");
      infoDiv.className = "info-box";
      infoDiv.innerHTML = `<h3>${info.nama}</h3><p>Harga: ${info.harga}</p><p>Bahan: ${info.bahan}</p>`;
      document.body.appendChild(infoDiv);

      // Position the info box near the model
      const screenPosition = toScreenPosition(newModel, camera);
      infoDiv.style.left = `${screenPosition.x}px`;
      infoDiv.style.top = `${screenPosition.y}px`;

      setTimeout(() => {
        infoDiv.remove();
      }, 5000); // Remove after 5 seconds
    }
  }

  const onClicked = (e, selectItem, index) => {
    itemSelectedIndex = index;

    // remove image selection from others to indicate unclicked
    for (let i = 0; i < items.length; i++) {
      const el = document.querySelector(`#item` + i);
      el.classList.remove("clicked");
    }
    // set image to selected
    e.target.classList.add("clicked");
  };

  function setupFurnitureSelection() {
    for (let i = 0; i < items.length; i++) {
      const el = document.querySelector(`#item` + i);
      el.addEventListener("beforexrselect", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClicked(e, loadedModels[i], i);
      });
    }
  }


  function toScreenPosition(obj, camera) {
    var vector = new THREE.Vector3();

    var widthHalf = 0.5 * renderer.getContext().canvas.width;
    var heightHalf = 0.5 * renderer.getContext().canvas.height;

    obj.updateMatrixWorld();
    vector.setFromMatrixPosition(obj.matrixWorld);
    vector.project(camera);

    vector.x = vector.x * widthHalf + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;

    return {
      x: vector.x,
      y: vector.y,
    };
  }

  function animate() {
    renderer.setAnimationLoop(render);
  }

  function render(timestamp, frame) {
    if (frame) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (hitTestSourceRequested === false) {
        session.requestReferenceSpace("viewer").then(function (referenceSpace) {
          session
            .requestHitTestSource({ space: referenceSpace })
            .then(function (source) {
              hitTestSource = source;
            });
        });

        session.addEventListener("end", function () {
          hitTestSourceRequested = false;
          hitTestSource = null;
        });

        hitTestSourceRequested = true;
      }

      if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);

        if (hitTestResults.length) {
          const hit = hitTestResults[0];

          reticle.visible = true;
          reticle.matrix.fromArray(
            hit.getPose(referenceSpace).transform.matrix
          );
        } else {
          reticle.visible = false;
        }
      }
    }

    renderer.render(scene, camera);
  }

  return <div className="App"></div>;
}

export default App;

