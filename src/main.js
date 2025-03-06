import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// App state
const state = {
  currentView: 'life', // 'life' or 'day'
  transitioning: false,
  currentDay: new Date(),
  dayTemplate: `# Morning Routine
06:00 - 09:00

# Work Session 1
09:00 - 12:00

# Lunch Break
12:00 - 13:00

# Work Session 2
13:00 - 17:00

# Exercise
17:00 - 18:00

# Dinner
18:00 - 19:00

# Personal Time
19:00 - 22:00

# Sleep
22:00 - 06:00`
}

// Setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf5f5f5)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.getElementById('app').appendChild(renderer.domElement)

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(1, 1, 1)
scene.add(directionalLight)

// Controls for development/debugging
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.enabled = false // Disable controls initially

// Life View - Grid of days
const lifeViewGroup = new THREE.Group()
scene.add(lifeViewGroup)

// Day View - Timeline of blocks
const dayViewGroup = new THREE.Group()
dayViewGroup.visible = false
scene.add(dayViewGroup)

// Create Life View
function createLifeView() {
  const yearsToShow = 90 // Show 90 years of life
  const daysPerRow = 365 // Days per row (approximately 1 year)
  const rows = Math.ceil((yearsToShow * 365) / daysPerRow)
  
  const gridWidth = 10
  const cellSize = gridWidth / daysPerRow
  const gridHeight = rows * cellSize
  
  // Calculate total days lived
  const birthDate = new Date(state.currentDay)
  birthDate.setFullYear(birthDate.getFullYear() - 35) // Assuming 30 years old
  const daysSinceBirth = Math.floor((state.currentDay - birthDate) / (1000 * 60 * 60 * 24))
  
  // Create grid of squares
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < daysPerRow; col++) {
      const dayIndex = row * daysPerRow + col
      
      const geometry = new THREE.PlaneGeometry(cellSize * 0.9, cellSize * 0.9)
      
      // Different materials based on past, present, future
      let material
      if (dayIndex < daysSinceBirth) {
        // Past day - filled white
        material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      } else if (dayIndex === daysSinceBirth) {
        // Current day - half filled
        material = new THREE.MeshBasicMaterial({ 
          color: 0x4a90e2, 
          side: THREE.DoubleSide 
        })
      } else {
        // Future day - empty (just outline)
        material = new THREE.MeshBasicMaterial({ 
          color: 0xe0e0e0, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5
        })
      }
      
      const square = new THREE.Mesh(geometry, material)
      
      // Position square in grid
      const xPos = col * cellSize - gridWidth / 2 + cellSize / 2
      const yPos = -row * cellSize + gridHeight / 2 - cellSize / 2
      square.position.set(xPos, yPos, 0)
      
      // Add metadata
      square.userData = {
        dayIndex,
        isCurrent: dayIndex === daysSinceBirth
      }
      
      // Add click event for the current day
      if (dayIndex === daysSinceBirth) {
        square.userData.clickable = true
        square.userData.onClick = () => {
          transitionToDay()
        }
      }
      
      lifeViewGroup.add(square)
    }
  }
}

// Create Day View
function createDayView() {
  // Parse the day template to create blocks
  const blocks = parseDayTemplate(state.dayTemplate)
  
  // Create timeline
  const timelineHeight = 10 // Height of the full day in 3D units
  const hourHeight = timelineHeight / 24 // Height per hour
  
  // Clear existing blocks first
  while(dayViewGroup.children.length > 0) {
    dayViewGroup.remove(dayViewGroup.children[0])
  }
  
  console.log(`Creating ${blocks.length} day blocks`)
  
  blocks.forEach(block => {
    const startHour = getHourFromTimeString(block.startTime)
    const endHour = getHourFromTimeString(block.endTime)
    const duration = endHour - startHour
    
    // Handle overnight blocks (when end time is less than start time)
    const adjustedDuration = duration < 0 ? duration + 24 : duration
    
    // Create block mesh
    const blockHeight = adjustedDuration * hourHeight
    const geometry = new THREE.BoxGeometry(3, blockHeight, 0.1)
    
    // Generate a color based on the block type
    const blockColor = getBlockColor(block.title)
    
    const material = new THREE.MeshStandardMaterial({
      color: blockColor,
      metalness: 0.1,
      roughness: 0.7
    })
    
    const blockMesh = new THREE.Mesh(geometry, material)
    
    // Position block on timeline
    const yPos = -(startHour + adjustedDuration / 2) * hourHeight + timelineHeight / 2
    blockMesh.position.set(0, yPos, 0)
    
    // Add block title
    const blockTitle = createTextMesh(block.title, 0.2)
    blockTitle.position.set(0, blockHeight / 2 - 0.3, 0.06)
    blockMesh.add(blockTitle)
    
    // Add time label
    const timeLabel = createTextMesh(`${block.startTime} - ${block.endTime}`, 0.15)
    timeLabel.position.set(0, -blockHeight / 2 + 0.2, 0.06)
    blockMesh.add(timeLabel)
    
    dayViewGroup.add(blockMesh)
  })
  
  // Create current time indicator
  const indicatorGeometry = new THREE.PlaneGeometry(4, 0.05);
  const indicatorMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff3333,
    side: THREE.DoubleSide, // Make sure it's visible from both sides
    transparent: true,
    opacity: 0.9,
    depthTest: false // Ensures the indicator is always rendered on top
  });
  const timeIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
  timeIndicator.position.z = 0.15; // Increased z-position to be in front of blocks (blocks are 0.1 deep)
  dayViewGroup.add(timeIndicator);
  dayViewGroup.userData.timeIndicator = timeIndicator;
  
  // Hide initially but don't position behind
  dayViewGroup.visible = false
  dayViewGroup.position.z = 0 // Position at the origin instead of behind
}

// Helper function: Get color based on block title
function getBlockColor(title) {
  // Map common activities to colors
  const colorMap = {
    'Morning Routine': 0x66bb6a,  // Green
    'Work': 0x42a5f5,             // Blue
    'Work Session': 0x42a5f5,     // Blue
    'Lunch': 0xffb74d,            // Orange
    'Lunch Break': 0xffb74d,      // Orange
    'Exercise': 0xf06292,         // Pink
    'Dinner': 0xffb74d,           // Orange
    'Personal': 0xba68c8,         // Purple
    'Personal Time': 0xba68c8,    // Purple
    'Sleep': 0x78909c            // Blue-grey
  }
  
  // Check if the title contains any of the keys
  for (const [key, color] of Object.entries(colorMap)) {
    if (title.includes(key)) {
      return color
    }
  }
  
  // Default color
  return 0x4a90e2
}

// Helper function: Create text mesh
function createTextMesh(text, size) {
  // In a full implementation, we would use TextGeometry from Three.js
  // For simplicity, we'll create a placeholder plane with metadata
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, size),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
  )
  plane.userData.text = text
  
  // In production, replace this with actual TextGeometry
  // For now we'll display the text using HTML overlay in updateLabels()
  
  return plane
}

// Helper function: Parse day template from markdown
function parseDayTemplate(template) {
  const blocks = [];
  const lines = template.trim().split('\n');
  
  console.log(`Parsing template with ${lines.length} lines`);
  
  // Improved parsing that's more forgiving of spacing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // If this is a heading
    if (line.startsWith('#')) {
      const title = line.replace('#', '').trim();
      
      // Look for time range in next line if available
      if (i + 1 < lines.length) {
        const timeLine = lines[i + 1].trim();
        if (timeLine.includes('-')) {
          const times = timeLine.split('-').map(t => t.trim());
          if (times.length === 2) {
            blocks.push({
              title,
              startTime: times[0],
              endTime: times[1]
            });
            console.log(`Added block: ${title} (${times[0]} - ${times[1]})`);
          }
        }
      }
    }
  }
  
  return blocks;
}

// Helper function: Convert time string to hour number
function getHourFromTimeString(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours + minutes / 60
}

// Transition from Life view to Day view
function transitionToDay() {
  if (state.transitioning) return;
  
  console.log("Transitioning to day view");
  
  state.transitioning = true;
  controls.enabled = false;
  
  // Find the current day square for zoom target
  let currentDaySquare;
  lifeViewGroup.children.forEach(child => {
    if (child.userData.isCurrent) {
      currentDaySquare = child;
    }
  });
  
  if (!currentDaySquare) {
    console.error("No current day square found");
    return;
  }
  
  // Starting camera position
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  
  // Target position (zoomed into the current day)
  const targetPos = currentDaySquare.position.clone();
  targetPos.z = 3; // Not too close, give some perspective
  
  // Make day view ready but invisible until animation progresses
  dayViewGroup.visible = false;
  dayViewGroup.position.set(0, 0, 0); // Reset position to origin
  
  // Animation variables
  let startTime = null;
  const duration = 2000; // ms
  
  function animateTransition(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease in-out function
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    // Move camera
    camera.position.lerpVectors(startPos, targetPos, eased);
    
    // Update controls target
    controls.target.lerpVectors(startTarget, new THREE.Vector3(0, 0, 0), eased);
    controls.update();
    
    // Near the end of animation, switch views
    if (progress > 0.8) {
      if (!dayViewGroup.visible) {
        console.log("Making day view visible");
        lifeViewGroup.visible = false;
        dayViewGroup.visible = true;
        // Update time indicator immediately
        updateTimeIndicator();
        updateLabels();
      }
    }
    
    if (progress < 1) {
      requestAnimationFrame(animateTransition);
    } else {
      // Animation complete
      state.currentView = 'day';
      state.transitioning = false;
      controls.enabled = true;
      console.log("Transition to day complete");
    }
    
    renderer.render(scene, camera);
  }
  
  requestAnimationFrame(animateTransition);
}

// Transition from Day view back to Life view
function transitionToLife() {
  if (state.transitioning) return
  
  state.transitioning = true
  controls.enabled = false
  
  // Find the current day square for zoom target
  let currentDaySquare
  lifeViewGroup.children.forEach(child => {
    if (child.userData.isCurrent) {
      currentDaySquare = child
    }
  })
  
  if (!currentDaySquare) return
  
  // Starting camera position
  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()
  
  // Target position (zoomed out to the life view)
  const targetPos = new THREE.Vector3(0, 0, 5)
  
  // Animation variables
  let startTime = null
  const duration = 2000 // ms
  
  function animateTransition(timestamp) {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Ease in-out function
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2
    
    // Move camera
    camera.position.lerpVectors(startPos, targetPos, eased)
    
    // Update controls target
    controls.target.lerpVectors(startTarget, new THREE.Vector3(0, 0, 0), eased)
    controls.update()
    
    // Near the end of animation, switch views
    if (progress > 0.8 && !lifeViewGroup.visible) {
      dayViewGroup.visible = false
      lifeViewGroup.visible = true
    }
    
    if (progress < 1) {
      requestAnimationFrame(animateTransition)
    } else {
      // Animation complete
      state.currentView = 'life'
      state.transitioning = false
      controls.enabled = true
    }
    
    renderer.render(scene, camera)
  }
  
  requestAnimationFrame(animateTransition)
}

// Update time indicator position based on current time
function updateTimeIndicator() {
  if (!dayViewGroup.userData.timeIndicator) return;
  
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentHour = hours + minutes / 60;
  
  const timelineHeight = 10;
  const hourHeight = timelineHeight / 24;
  
  // Position indicator at current time
  const yPos = -currentHour * hourHeight + timelineHeight / 2;
  dayViewGroup.userData.timeIndicator.position.y = yPos;
}

// Create HTML overlays for text
function createHTMLOverlays() {
  // Create container
  const labelsContainer = document.createElement('div')
  labelsContainer.id = 'labels-container'
  labelsContainer.style.position = 'absolute'
  labelsContainer.style.top = '0'
  labelsContainer.style.left = '0'
  labelsContainer.style.width = '100%'
  labelsContainer.style.height = '100%'
  labelsContainer.style.pointerEvents = 'none'
  document.body.appendChild(labelsContainer)
}

// Update HTML labels for block titles and times
function updateLabels() {
  const labelsContainer = document.getElementById('labels-container')
  if (!labelsContainer) {
    console.warn("Labels container not found")
    return
  }
  
  // Clear existing labels
  labelsContainer.innerHTML = ''
  
  if (state.currentView !== 'day' || !dayViewGroup.visible) return
  
  console.log("Updating labels for day view")
  
  // Add back button when in day view
  const backButton = document.createElement('button')
  backButton.textContent = 'Back to Life View'
  backButton.style.position = 'absolute'
  backButton.style.top = '20px'
  backButton.style.left = '20px'
  backButton.style.zIndex = '1000'
  backButton.style.pointerEvents = 'auto'
  backButton.addEventListener('click', transitionToLife)
  labelsContainer.appendChild(backButton)
  
  // Add current time display
  const now = new Date()
  const timeDisplay = document.createElement('div')
  timeDisplay.textContent = now.toLocaleTimeString()
  timeDisplay.style.position = 'absolute'
  timeDisplay.style.top = '20px'
  timeDisplay.style.right = '20px'
  timeDisplay.style.padding = '8px 12px'
  timeDisplay.style.background = 'rgba(0, 0, 0, 0.7)'
  timeDisplay.style.color = 'white'
  timeDisplay.style.borderRadius = '4px'
  timeDisplay.style.fontFamily = 'Inter, sans-serif'
  timeDisplay.style.fontSize = '16px'
  timeDisplay.style.zIndex = '1000'
  labelsContainer.appendChild(timeDisplay)
  
  // Count labels we'll add
  let labelCount = 0
  
  // Update all text meshes
  dayViewGroup.traverse((object) => {
    if (object.userData && object.userData.text) {
      const screenPosition = getScreenPosition(object)
      
      // Skip if the object is behind the camera or too far to the sides
      if (screenPosition.behind || 
          screenPosition.x < 0 || 
          screenPosition.x > window.innerWidth || 
          screenPosition.y < 0 || 
          screenPosition.y > window.innerHeight) {
        return
      }
      
      const label = document.createElement('div')
      label.textContent = object.userData.text
      label.style.position = 'absolute'
      label.style.left = `${screenPosition.x}px`
      label.style.top = `${screenPosition.y}px`
      label.style.fontSize = `${object.geometry.parameters.height * 40}px`
      label.style.fontFamily = 'Inter, sans-serif'
      label.style.color = 'black'
      label.style.transform = 'translate(-50%, -50%)'
      label.style.textAlign = 'center'
      label.style.fontWeight = 'bold'
      label.style.pointerEvents = 'none'
      label.style.textShadow = '0px 0px 2px white'
      
      labelsContainer.appendChild(label)
      labelCount++
    }
  })
  
  console.log(`Added ${labelCount} text labels`)
}

// Helper function to get screen position of a 3D object
function getScreenPosition(object) {
  const vector = new THREE.Vector3()
  
  // Get world position
  object.updateMatrixWorld(true)
  vector.setFromMatrixPosition(object.matrixWorld)
  
  // Check if behind camera
  const directionToCamera = new THREE.Vector3().subVectors(camera.position, vector)
  const isBehind = directionToCamera.dot(camera.getWorldDirection(new THREE.Vector3())) > 0
  
  // Project to screen
  vector.project(camera)
  
  // Convert to screen coordinates
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth
  const y = (vector.y * -0.5 + 0.5) * window.innerHeight
  
  return { 
    x, 
    y,
    behind: isBehind
  }
}

// Setup raycasting for interactive elements
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

function onMouseClick(event) {
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  
  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera)
  
  // Calculate objects intersecting with the ray
  const intersects = raycaster.intersectObjects(lifeViewGroup.children)
  
  for (let i = 0; i < intersects.length; i++) {
    const object = intersects[i].object
    if (object.userData.clickable && object.userData.onClick) {
      object.userData.onClick()
      break
    }
  }
}

// Window resize handler
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  
  // Update controls
  controls.update()
  
  // Update time indicator in day view
  if (state.currentView === 'day' && dayViewGroup.visible) {
    updateTimeIndicator()
    updateLabels()
  }
  
  // Render scene
  renderer.render(scene, camera)
}

// Initialize
function init() {
  // Show loading screen
  const loadingScreen = document.querySelector('.loading-screen')
  
  // Create views
  createLifeView()
  createDayView()
  createHTMLOverlays()
  
  // Event listeners
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('click', onMouseClick)
  
  // Hide loading screen after a short delay
  setTimeout(() => {
    loadingScreen.classList.add('hidden')
    
    // Remove loading screen after transition
    setTimeout(() => {
      loadingScreen.remove()
    }, 500)
  }, 1000)
  
  // Start animation loop
  animate()
  
  // Add tooltip for current day
  const tooltip = document.createElement('div')
  tooltip.className = 'tooltip'
  tooltip.textContent = 'Click to view today'
  document.body.appendChild(tooltip)
  
  // Show tooltip when hovering over current day
  lifeViewGroup.children.forEach(child => {
    if (child.userData.isCurrent) {
      const currentDay = child
      
      // Add hover effect
      renderer.domElement.addEventListener('mousemove', (event) => {
        raycaster.setFromCamera(
          new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
          ),
          camera
        )
        
        const intersects = raycaster.intersectObject(currentDay)
        
        if (intersects.length > 0) {
          const screenPos = getScreenPosition(currentDay)
          tooltip.style.left = `${screenPos.x}px`
          tooltip.style.top = `${screenPos.y}px`
          tooltip.classList.add('visible')
        } else {
          tooltip.classList.remove('visible')
        }
      })
    }
  })
}

init()
