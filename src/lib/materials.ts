/**
 * Shared materials. Re-using material instances across meshes keeps the
 * number of shader programs (and GPU state changes) small — important on
 * mobile.
 */
import * as THREE from 'three'

export const palette = {
  cream: '#f8f0e6',
  creamDeep: '#efe2d3',
  beige: '#e8d6c2',
  blush: '#f1d3d1',
  pink: '#f2a9bb',
  rose: '#e48aa3',
  roseGold: '#d9a291',
  gold: '#d9b36c',
  lavender: '#e3d9f3',
  lavenderDeep: '#c9b8ef',
  leaf: '#7fae8a',
  leafDark: '#5f9373',
}

const std = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(params)

export const materials = {
  wall: std({ color: '#f3e6da', roughness: 0.92 }),
  wallLavender: std({ color: '#ece3f6', roughness: 0.92 }),
  wallBlush: std({ color: '#f7e1df', roughness: 0.92 }),
  wainscot: std({ color: '#ecc6c4', roughness: 0.8 }),
  ceiling: std({ color: '#fbf5ee', roughness: 1 }),
  trim: std({ color: '#f7ede2', roughness: 0.6 }),
  roseGold: std({ color: '#ecb7a6', metalness: 0.6, roughness: 0.3 }),
  gold: std({ color: palette.gold, metalness: 0.9, roughness: 0.26 }),
  brass: std({ color: '#c9a464', metalness: 0.85, roughness: 0.35 }),
  marble: std({ color: '#f9f4ee', roughness: 0.3 }),
  marblePink: std({ color: '#f6dcdc', roughness: 0.3 }),
  velvet: std({ color: '#e7a3b4', roughness: 0.95 }),
  velvetLavender: std({ color: '#c8b6e8', roughness: 0.95 }),
  ivoryFrame: std({ color: '#fbf6ef', roughness: 0.5 }),
  photoMat: new THREE.MeshBasicMaterial({ color: '#fbf6ee', toneMapped: true }),
  pot: std({ color: '#f4ece2', roughness: 0.55 }),
  leaf: std({ color: palette.leaf, roughness: 0.85 }),
  leafDark: std({ color: palette.leafDark, roughness: 0.85 }),
  blossom: std({ color: '#f7bfd0', roughness: 0.8 }),
  blossomWhite: std({ color: '#fff4f4', roughness: 0.8 }),
  bulb: new THREE.MeshBasicMaterial({ color: '#fff2d6', toneMapped: false }),
  /** White base for instanced meshes that set a per-instance colour */
  tintable: std({ color: '#ffffff', roughness: 0.8 }),
  water: std({ color: '#cfeaf5', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 }),
}
