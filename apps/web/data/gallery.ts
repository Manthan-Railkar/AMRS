export interface GalleryRowItem {
  src: string;
  alt: string;
  width: number;
  height: number;
  isTall?: boolean;
}

export const galleryRows: GalleryRowItem[][] = [
  [
    { src: '/assets/img/g01-plant.jpg', alt: 'Glowing wheat stalks against a dusk sky', width: 406, height: 308 },
    { src: '/assets/img/g02-car.jpg', alt: 'Car driving along a steep ridge', width: 242, height: 324, isTall: true },
    { src: '/assets/img/g03-wave.jpg', alt: 'Waves of dunes under an indigo sky', width: 406, height: 308 },
  ],
  [
    { src: '/assets/img/g04-skier-swirl.jpg', alt: 'Lone skier on swirling dunes', width: 417, height: 296 },
    { src: '/assets/img/g05-astronaut-planet.jpg', alt: 'Figure standing beneath a ringed planet', width: 237, height: 318, isTall: true },
    { src: '/assets/img/g06-skier-dune.jpg', alt: 'Skier crossing a dune ridge', width: 416, height: 296 },
  ],
  [
    { src: '/assets/img/g07-swirl-road.jpg', alt: 'Dark silhouette over flowing light ribbons', width: 392, height: 312 },
    { src: '/assets/img/g08-arch-road.jpg', alt: 'Road curving beneath a glowing arch', width: 244, height: 326, isTall: true },
    { src: '/assets/img/g09-arch-glow.jpg', alt: 'Glowing dome rising from a plain', width: 390, height: 314 },
  ],
  [
    { src: '/assets/img/g10-surf-figure.jpg', alt: 'Silhouette surfing a wave of light', width: 406, height: 288 },
    { src: '/assets/img/g11-astronaut-white.jpg', alt: 'Astronaut riding a luminous slope', width: 235, height: 314, isTall: true },
    { src: '/assets/img/g12-cat-dune.jpg', alt: 'Cat walking across a dune', width: 404, height: 288 },
  ],
];

