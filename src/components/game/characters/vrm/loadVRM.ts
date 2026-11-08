/**
 * Loads VRM avatars (glTF + humanoid/expression/spring-bone extensions)
 * once per URL and caches them. `readVRM` is Suspense-friendly: it throws
 * the pending promise until the model is ready.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm'
import { DefaultLoadingManager } from 'three'
import { assetUrl } from '../../../../lib/assets'

interface Entry {
  promise: Promise<VRM>
  vrm?: VRM
  error?: unknown
}

const cache = new Map<string, Entry>()

function makeLoader() {
  // DefaultLoadingManager feeds drei's useProgress → the welcome screen bar
  const loader = new GLTFLoader(DefaultLoadingManager)
  loader.register((parser) => new VRMLoaderPlugin(parser))
  return loader
}

export function loadVRM(url: string): Promise<VRM> {
  const hit = cache.get(url)
  if (hit) return hit.promise
  const entry: Entry = {
    promise: makeLoader()
      .loadAsync(assetUrl(url))
      .then((gltf) => {
        const vrm = gltf.userData.vrm as VRM
        VRMUtils.removeUnnecessaryVertices(gltf.scene)
        VRMUtils.combineSkeletons(gltf.scene)
        VRMUtils.rotateVRM0(vrm) // VRM 0.x faces -Z; turn it to face +Z like everything else
        vrm.scene.traverse((o) => {
          o.frustumCulled = false
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true
            o.receiveShadow = true
          }
        })
        entry.vrm = vrm
        return vrm
      })
      .catch((e) => {
        entry.error = e
        throw e
      }),
  }
  cache.set(url, entry)
  return entry.promise
}

export function readVRM(url: string): VRM {
  const entry = cache.get(url) ?? (loadVRM(url), cache.get(url)!)
  if (entry.vrm) return entry.vrm
  if (entry.error) throw entry.error
  throw entry.promise
}
