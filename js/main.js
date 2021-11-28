let canvas
let gl
let shader
let batcher
let mvp = new spine.webgl.Matrix4()
let assetManager
let skeletonRenderer

let lastFrameTime
let spineData
let fps

const BINARY_PATH = '/assets/Akane_home.skel'
const ATLAS_PATH = '/assets/Akane_home@2x.atlas'
const WELCOME_ANIMATION = 'Start_Idle_01'
const LOOPING_ANIMATION = 'Idle_01'

let customScale = 1.7
let targetFps = 144

function init() {
    // Wallpaper Engine settings
    window.wallpaperPropertyListener = {
        applyUserProperties: (props) => {
            customScale = props.scale.value
            targetFps = props.targetfps.value
        }
    }

    // Setup canvas and WebGL context. We pass alpha: false to canvas.getContext() so we don't use premultiplied alpha when
    // loading textures. That is handled separately by PolygonBatcher.
    canvas = document.getElementById('canvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    let config = { alpha: false }
    gl =
        canvas.getContext('webgl', config) ||
        canvas.getContext('experimental-webgl', config)
    if (!gl) {
        alert('WebGL is unavailable.')
        return
    }

    // Create a simple shader, mesh, model-view-projection matrix, SkeletonRenderer, and AssetManager.
    shader = spine.webgl.Shader.newTwoColoredTextured(gl)
    batcher = new spine.webgl.PolygonBatcher(gl)
    mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1)
    skeletonRenderer = new spine.webgl.SkeletonRenderer(gl)
    assetManager = new spine.webgl.AssetManager(gl)

    // Tell AssetManager to load the resources for each skeleton, including the exported .skel file, the .atlas file and the .png
    // file for the atlas. We then wait until all resources are loaded in the load() method.
    assetManager.loadBinary(BINARY_PATH)
    assetManager.loadTextureAtlas(ATLAS_PATH)

    requestAnimationFrame(load)
}

function load() {
    // Wait until the AssetManager has loaded all resources, then load the skeletons.
    if (assetManager.isLoadingComplete()) {
        spineData = loadSpineData(false)
        lastFrameTime = Date.now() / 1000
        requestAnimationFrame(render) // Loading is done, call render every frame.
    } else {
        requestAnimationFrame(load)
    }
}

function loadSpineData(premultipliedAlpha) {
    // Load the texture atlas from the AssetManager.
    let atlas = assetManager.get(ATLAS_PATH)

    // Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
    let atlasLoader = new spine.AtlasAttachmentLoader(atlas)

    // Create a SkeletonBinary instance for parsing the .skel file.
    let skeletonBinary = new spine.SkeletonBinary(atlasLoader)

    // Set the scale to apply during parsing, parse the file, and create a new skeleton.
    skeletonBinary.scale = 1
    let skeletonData = skeletonBinary.readSkeletonData(
        assetManager.get(BINARY_PATH)
    )
    let skeleton = new spine.Skeleton(skeletonData)
    let bounds = calculateSetupPoseBounds(skeleton)

    // Create an AnimationState, and set the initial animation in looping mode.
    let animationStateData = new spine.AnimationStateData(skeleton.data)
    let animationState = new spine.AnimationState(animationStateData)

    animationState.addAnimation(0, WELCOME_ANIMATION, false)
    animationState.addAnimation(0, LOOPING_ANIMATION, true, 0)

    // Pack everything up and return to caller.
    return {
        skeleton: skeleton,
        state: animationState,
        bounds: bounds,
        premultipliedAlpha: premultipliedAlpha
    }
}

function calculateSetupPoseBounds(skeleton) {
    skeleton.setToSetupPose()
    skeleton.updateWorldTransform()
    let offset = new spine.Vector2()
    let size = new spine.Vector2()
    skeleton.getBounds(offset, size, [])
    return { offset: offset, size: size }
}

function render() {
    let now = Date.now() / 1000
    let delta = now - lastFrameTime
    let fps = 1 / delta

    lastFrameTime = now

    // Update the MVP matrix to adjust for canvas size changes
    resize()

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Apply the animation state based on the delta time.
    let skeleton = spineData.skeleton
    let state = spineData.state
    let premultipliedAlpha = spineData.premultipliedAlpha
    state.update(delta)
    state.apply(skeleton)
    skeleton.updateWorldTransform()

    // Bind the shader and set the texture and model-view-projection matrix.
    shader.bind()
    shader.setUniformi(spine.webgl.Shader.SAMPLER, 0)
    shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values)

    // Start the batch and tell the SkeletonRenderer to render the active skeleton.
    batcher.begin(shader)
    skeletonRenderer.premultipliedAlpha = premultipliedAlpha
    skeletonRenderer.draw(batcher, skeleton)
    batcher.end()

    shader.unbind()

    // throttle fps
    let elapsed = Date.now() / 1000 - now
    let targetFrameTime = 1 / targetFps
    let delay = Math.max(targetFrameTime - elapsed, 0) * 1000

    setTimeout(() => {
        requestAnimationFrame(render)
    }, delay)
}

function resize() {
    let w = canvas.clientWidth
    let h = canvas.clientHeight
    if (canvas.width != w || canvas.height != h) {
        canvas.width = w
        canvas.height = h
    }

    // Calculations to center the skeleton in the canvas.
    let bounds = spineData.bounds
    let centerX = bounds.offset.x + bounds.size.x / 2
    let centerY = bounds.offset.y + bounds.size.y / 2
    let scaleX = bounds.size.x / canvas.width
    let scaleY = bounds.size.y / canvas.height
    let scale = Math.max(scaleX, scaleY) * 1.2
    scale = Math.max(scale, 1)
    scale = scale / customScale
    let width = canvas.width * scale
    let height = canvas.height * scale

    mvp.ortho2d(centerX - width / 2, centerY - height / 2, width, height)
    gl.viewport(0, 0, canvas.width, canvas.height)
}

init()

document.addEventListener('DOMContentLoaded', function () {
    function resizeCanvas() {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
    }

    window.addEventListener('orientationchange', resizeCanvas)
    window.addEventListener('resize', resizeCanvas)

	resizeCanvas()
    resize()
})

window.addEventListener('load', function () {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('sw.js')
            .then((registration) => {
                console.info('Registered:', registration)
            })
            .catch((err) => {
                console.error('Registration failed: ', err)
            })
    }
})

console.log("https://github.com/SaltyAom/akane")
