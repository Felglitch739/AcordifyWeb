import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  type Material,
} from 'three';

const STRING_POINTS = 40;
const BRIDGE_Y = -1.28;
const NUT_Y = 2.55;
const STROKE = '#e6ff58';

export function createGuitarModel() {
  const model = new Group();
  const blue = new MeshPhysicalMaterial({ color: '#0d2851', roughness: 0.33, metalness: 0.52, clearcoat: 1, clearcoatRoughness: 0.19 });
  const maple = new MeshStandardMaterial({ color: '#9e5b2d', roughness: 0.62 });
  const fingerboard = new MeshStandardMaterial({ color: '#39231d', roughness: 0.68 });
  const guard = new MeshPhysicalMaterial({ color: '#d8d2c5', roughness: 0.35, clearcoat: 0.4 });
  const chrome = new MeshStandardMaterial({ color: '#b8c5de', roughness: 0.21, metalness: 0.85 });
  const inlay = new MeshStandardMaterial({ color: '#ede8dc', roughness: 0.48 });
  const black = new MeshStandardMaterial({ color: '#141922', roughness: 0.48, metalness: 0.25 });
  const rim = new LineBasicMaterial({ color: '#93b8ff', transparent: true, opacity: 0.16 });

  function outline(shape: Shape, depth: number, bevel: number, z: number, material: Material) {
    const geometry = new ExtrudeGeometry(shape, {
      depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel,
      bevelSegments: 4, curveSegments: 11, steps: 1,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.z = z;
    model.add(mesh);
  }

  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: Material) {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    model.add(mesh);
  }

  function cylinder(x: number, y: number, z: number, radius: number, height: number, material: Material) {
    const mesh = new Mesh(new CylinderGeometry(radius, radius, height, 18), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    model.add(mesh);
  }

  const body = new Shape();
  body.moveTo(-0.29, 0.18);
  body.bezierCurveTo(-0.48, 0.21, -0.55, 0.69, -0.81, 0.67);
  body.bezierCurveTo(-1.1, 0.62, -1.03, 0.16, -0.86, -0.30);
  body.bezierCurveTo(-0.72, -0.67, -1.09, -0.83, -1.17, -1.35);
  body.bezierCurveTo(-1.30, -2.01, -0.84, -2.34, -0.28, -2.38);
  body.bezierCurveTo(0.48, -2.47, 1.26, -2.10, 1.19, -1.46);
  body.bezierCurveTo(1.16, -1.04, 0.80, -0.78, 0.79, -0.49);
  body.bezierCurveTo(0.80, -0.15, 1.03, 0.34, 0.72, 0.40);
  body.bezierCurveTo(0.52, 0.43, 0.48, 0.03, 0.29, 0.06);
  body.lineTo(-0.29, 0.18);
  outline(body, .25, .085, -.17, blue);

  const edge = new Line(new BufferGeometry().setFromPoints(body.getPoints(45)), rim);
  edge.position.z = .14;
  model.add(edge);

  const plate = new Shape();
  plate.moveTo(-.27, .04);
  plate.lineTo(.27, .04);
  plate.bezierCurveTo(.54, -.04, .49, -.23, .58, -.44);
  plate.bezierCurveTo(.59, -.80, .93, -1.16, .99, -1.53);
  plate.bezierCurveTo(1.02, -1.84, .76, -1.93, .56, -1.83);
  plate.bezierCurveTo(.27, -1.72, .50, -1.49, .15, -1.43);
  plate.bezierCurveTo(-.11, -1.40, -.69, -1.37, -.76, -1.03);
  plate.bezierCurveTo(-.84, -.66, -.46, -.49, -.41, -.16);
  plate.lineTo(-.27, .04);
  outline(plate, .019, .017, .172, guard);

  const neck = new Shape();
  neck.moveTo(-.263, -.15);
  neck.lineTo(.263, -.15);
  neck.lineTo(.168, NUT_Y);
  neck.lineTo(-.168, NUT_Y);
  neck.closePath();
  outline(neck, .13, .04, .06, maple);
  outline(neck, .041, .012, .20, fingerboard);

  const headstock = new Shape();
  headstock.moveTo(-.166, NUT_Y - .02);
  headstock.bezierCurveTo(-.17, 2.68, -.32, 2.69, -.36, 2.79);
  headstock.bezierCurveTo(-.41, 2.94, -.385, 3.34, -.32, 3.51);
  headstock.quadraticCurveTo(0, 3.65, .32, 3.51);
  headstock.bezierCurveTo(.385, 3.34, .41, 2.94, .36, 2.79);
  headstock.bezierCurveTo(.32, 2.69, .17, 2.68, .166, NUT_Y - .02);
  headstock.closePath();
  outline(headstock, .13, .029, .052, maple);
  box(0, NUT_Y, .264, .35, .062, .065, inlay);

  for (let fret = 1; fret <= 22; fret++) {
    const distance = (NUT_Y - BRIDGE_Y) * 2 ** (-fret / 12);
    const y = BRIDGE_Y + distance;
    const width = .335 + (NUT_Y - y) * .069;
    box(0, y, .25, width, .018, .017, chrome);
    if ([3, 5, 7, 9, 12, 15, 17, 19, 21].includes(fret)) {
      const dotY = y + distance * (2 ** (1 / 12) - 1) / 2;
      if (fret === 12) {
        cylinder(-.076, dotY, .247, .023, .012, inlay);
        cylinder(.076, dotY, .247, .023, .012, inlay);
      } else cylinder(0, dotY, .247, .022, .012, inlay);
    }
  }

  const tuners = [
    [-.265, 2.86], [-.272, 3.12], [-.245, 3.38],
    [.245, 3.38], [.272, 3.12], [.265, 2.86],
  ] as const;
  for (const [x, y] of tuners) {
    const side = Math.sign(x);
    cylinder(x, y, .198, .055, .027, black);
    cylinder(x, y, .227, .032, .068, chrome);
    box(x, y, .048, .137, .112, .073, chrome);
    box(x + side * .105, y, .047, .153, .046, .05, chrome);
    box(x + side * .186, y, .051, .083, .122, .096, chrome);
  }

  for (const y of [-.46, -.87]) {
    box(0, y, .223, .666, .245, .071, black);
    box(0, y, .265, .555, .185, .045, chrome);
    for (let pole = 0; pole < 6; pole++) {
      cylinder((pole - 2.5) * .083, y, .295, .023, .014, black);
    }
  }
  box(0, BRIDGE_Y, .237, .619, .263, .087, chrome);
  box(0, -1.49, .22, .523, .095, .065, chrome);
  for (let saddle = 0; saddle < 6; saddle++) {
    box((saddle - 2.5) * .088, BRIDGE_Y + (saddle % 2) * .016, .291, .072, .109, .023, black);
  }
  for (const [x, y] of [[.49, -1.09], [.63, -1.34], [.73, -1.59]]) {
    cylinder(x, y, .258, .088, .125, black);
    cylinder(x, y, .328, .071, .026, chrome);
    box(x, y + .034, .346, .014, .031, .006, black);
  }
  for (const [x, y] of [[-.32, -.13], [-.56, -.40], [-.67, -1.12], [.46, -.25], [.87, -1.62], [.57, -1.74]]) {
    cylinder(x, y, .213, .022, .024, chrome);
  }

  const strings = tuners.map(([pegX, pegY], index) => {
    const positions = new BufferAttribute(new Float32Array((STRING_POINTS + 3) * 3), 3);
    const geometry = new BufferGeometry().setAttribute('position', positions);
    const material = new LineBasicMaterial({ color: index < 3 ? '#a6aab8' : '#e0e6ed' });
    const line = new Line(geometry, material);
    line.frustumCulled = false;
    model.add(line);
    return { positions, material, pegX, pegY };
  });

  function updateStrings(elapsed: number, pulse: number, frets: readonly number[]) {
    strings.forEach(({ positions, material, pegX, pegY }, index) => {
      const phase = index * .8;
      const x = index - 2.5;
      const moving = frets[index] >= 0 && pulse > .035;
      for (let point = 0; point <= STRING_POINTS; point++) {
        const progress = point / STRING_POINTS;
        const vibration = moving
          ? Math.sin(progress * Math.PI) * Math.sin(progress * 19 - elapsed * 34 + phase) * pulse * .044
          : 0;
        positions.setXYZ(point, x * (.087 + (.054 - .087) * progress) + vibration, BRIDGE_Y + (NUT_Y - BRIDGE_Y) * progress, .326);
      }
      positions.setXYZ(STRING_POINTS + 1, pegX, pegY, .254);
      positions.setXYZ(STRING_POINTS + 2, pegX, pegY, .221);
      positions.needsUpdate = true;
      material.color.set(moving ? STROKE : index < 3 ? '#a6aab8' : '#e0e6ed');
    });
  }

  model.position.y = -.53;
  return { model, updateStrings };
}
