import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// App state
const state = {
  currentView: 'life', // 'life' or 'day'
  transitioning: false,
  currentDay: new Date(),
  debugMode: false, // Debug flag for displaying grid coordinates
  dayTemplate: '' // Will be loaded from external file
}

// Setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

// Create orthographic camera instead of perspective
const frustumSize = 10;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2, // left
  frustumSize * aspect / 2,  // right
  frustumSize / 2,           // top
  frustumSize / -2,          // bottom
  0.1,                       // near
  1000                       // far
);
camera.position.z = 5;

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
controls.enabled = false // Always disabled in life view

// Life View - Grid of days
const lifeViewGroup = new THREE.Group()
scene.add(lifeViewGroup)

// Day View - Timeline of blocks
const dayViewGroup = new THREE.Group()
dayViewGroup.visible = false
scene.add(dayViewGroup)

// Load the day template from external file
async function loadDayTemplate() {
  try {
    const response = await fetch('dayTemplate.md');
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    state.dayTemplate = text;
    console.log('Day template loaded successfully');
    
    // Create day view once template is loaded
    createDayView();
  } catch (error) {
    console.error('Error loading day template:', error);
    // Fallback to default template
    state.dayTemplate = `# Morning Routine
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
22:00 - 06:00`;
    console.log('Using fallback template');
    createDayView();
  }
}

// Create Life View
function createLifeView() {
  // Clear existing contents if any
  while(lifeViewGroup.children.length > 0) {
    lifeViewGroup.remove(lifeViewGroup.children[0]);
  }

  // Clear any existing debug labels
  clearDebugLabels();

  const yearsToShow = 90; // Show 90 years of life
  const daysPerRow = 365; // Days per row (one year per row, ignoring leap years)
  const rows = yearsToShow;
  
  // Calculate base unit size for both blocks and spacing
  const baseUnit = 0.05; // Base unit for both block size and spacing
  const blockSize = baseUnit; // Cube size
  const horizontalSpacing = baseUnit * 3; // Horizontal spacing 3x the cube width
  const verticalSpacing = baseUnit * 3; // Vertical spacing 3x the cube width
  
  // Calculate grid dimensions
  const totalUnitWidth = daysPerRow * (blockSize + horizontalSpacing) - horizontalSpacing;
  const totalUnitHeight = rows * (blockSize + verticalSpacing) - verticalSpacing;
  
  console.log(`Grid dimensions: ${totalUnitWidth} x ${totalUnitHeight} units`);
  
  // Calculate the current day's position in the grid
  const today = new Date(state.currentDay);
  
  // Calculate the day of year (0-indexed)
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const currentDayOfYear = Math.floor(diff / oneDay); // Already 0-indexed, no need for -1 adjustment
  
  // Calculate years since birth (assuming 35 years old, so current year is in row 35)
  const currentAge = 35;
  const currentYear = currentAge;
  
  // Calculate the current day index in our grid
  const currentDayIndex = currentYear * daysPerRow + currentDayOfYear;
  
  // Calculate the position of the current day for camera targeting
  const currentDayXPos = currentDayOfYear * (blockSize + horizontalSpacing) - totalUnitWidth / 2 + blockSize / 2;
  const currentDayYPos = -currentYear * (blockSize + verticalSpacing) + totalUnitHeight / 2 - blockSize / 2;
  
  // Store current day position for camera initialization
  state.currentDayPosition = {
    x: currentDayXPos,
    y: currentDayYPos
  };
  
  console.log(`Current date: ${today.toDateString()}`);
  console.log(`Day of year: ${currentDayOfYear + 1} (${currentDayOfYear} 0-indexed)`);
  console.log(`Current year: ${currentYear} (row), Current day: ${currentDayOfYear} (column)`);
  
  // Create grid of cubes
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < daysPerRow; col++) {
      const dayIndex = row * daysPerRow + col;
      
      // Calculate position with different horizontal and vertical spacing
      const xPos = col * (blockSize + horizontalSpacing) - totalUnitWidth / 2 + blockSize / 2;
      const yPos = -row * (blockSize + verticalSpacing) + totalUnitHeight / 2 - blockSize / 2;
      
      let cube; // Will hold the created cube

      if (dayIndex < currentDayIndex) {
        // Past day - pure white solid cube
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        
        // Use MeshStandardMaterial instead of MeshBasicMaterial to respond to lighting
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xffffff, // Pure white
          metalness: 0.1,
          roughness: 0.8
        });
        
        cube = new THREE.Mesh(geometry, material);
        cube.position.set(xPos, yPos, blockSize / 2); // Position with z up from the plane
        
        // Add metadata
        cube.userData = {
          dayIndex,
          row,
          col,
          isCurrent: false
        };
        
        lifeViewGroup.add(cube);
      } else if (dayIndex === currentDayIndex) {
        // Current day - blue cube with point light
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x4a90e2,
          emissive: 0x2a5082,
          emissiveIntensity: 0.5,
          metalness: 0.5,
          roughness: 0.3
        });
        
        cube = new THREE.Mesh(geometry, material);
        cube.position.set(xPos, yPos, blockSize / 2); // Position with z up from the plane
        
        // Add metadata
        cube.userData = {
          dayIndex,
          row,
          col,
          isCurrent: true,
          clickable: true,
          onClick: () => {
            transitionToDay();
          }
        };
        
        lifeViewGroup.add(cube);
        
        // Enhanced point light at current day - position above the cube with higher intensity
        const pointLight = new THREE.PointLight(0x4a90e2, 100, blockSize * 200);
        pointLight.position.set(xPos, yPos, blockSize * 5); // Position well above the cube
        pointLight.userData = {
          pulsePhase: 0
        };
        lifeViewGroup.add(pointLight);
        
        // Add a second light for additional effect
        const secondLight = new THREE.PointLight(0xffffff, 50, blockSize * 100);
        secondLight.position.set(xPos, yPos, blockSize);
        lifeViewGroup.add(secondLight);
        
        // Store reference to current day cube and light for animation
        lifeViewGroup.userData.currentDayCube = cube;
        lifeViewGroup.userData.currentDayLight = pointLight;
        
        console.log(`Current day cube position: row ${row}, column ${col}, x: ${xPos}, y: ${yPos}`);
        
        // Add enhanced glowing sphere to represent the light source
        const glowGeometry = new THREE.SphereGeometry(blockSize * 0.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x4a90e2,
          transparent: true,
          opacity: 0.9
        });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        glowSphere.position.copy(pointLight.position);
        lifeViewGroup.add(glowSphere);
      } else {
        // Future day - pure white edge cube
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        
        // Create edges geometry with pure white lines
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ 
          color: 0xffffff, // Pure white
          transparent: true, // Enable transparency
          opacity: 0.3 // Set opacity to 0.74 as requested
        });
        
        cube = new THREE.LineSegments(edges, material);
        cube.position.set(xPos, yPos, blockSize / 2); // Position with z up from the plane
        
        // Add metadata
        cube.userData = {
          dayIndex,
          row,
          col,
          isCurrent: false
        };
        
        lifeViewGroup.add(cube);
      }
      
      // If debug mode is on, add row/column labels
      if (state.debugMode && (row % 5 === 0 || col % 30 === 0 || dayIndex === currentDayIndex)) {
        addDebugLabel(cube, `${row},${col}`);
      }
    }
  }
  
  // Position camera above current day
  positionCameraAboveCurrentDay();
  
  // Enable pan and zoom controls for life view
  setupLifeViewControls();
}

// Position camera above the current day
function positionCameraAboveCurrentDay() {
  if (!state.currentDayPosition) return;
  
  // Set camera position above current day
  camera.position.set(
    state.currentDayPosition.x,
    state.currentDayPosition.y,
    5 // Height doesn't affect orthographic view scale
  );
  
  // Set controls target to current day position
  controls.target.set(
    state.currentDayPosition.x,
    state.currentDayPosition.y,
    0
  );
  
  // Update life view controls pan offset to match
  if (state.lifeViewControls) {
    state.lifeViewControls.panOffset.x = -state.currentDayPosition.x;
    state.lifeViewControls.panOffset.y = -state.currentDayPosition.y;
  }
  
  // Update controls
  controls.update();
}

// Setup life view controls with pan and zoom but no rotation
function setupLifeViewControls() {
  // Make sure controls are disabled in Life view (we'll handle our own)
  controls.enabled = false;
  
  // Life view controls state - initialize with current day position
  state.lifeViewControls = {
    zooming: false,
    panning: false,
    lastMouseX: 0,
    lastMouseY: 0,
    zoomLevel: 1,
    panOffset: new THREE.Vector2(
      state.currentDayPosition ? -state.currentDayPosition.x : 0,
      state.currentDayPosition ? -state.currentDayPosition.y : 0
    )
  };
  
  // Add event listeners for life view zooming and panning
  renderer.domElement.addEventListener('wheel', onLifeViewZoom);
  renderer.domElement.addEventListener('mousedown', onLifeViewPanStart);
  renderer.domElement.addEventListener('mousemove', onLifeViewPanMove);
  renderer.domElement.addEventListener('mouseup', onLifeViewPanEnd);
  renderer.domElement.addEventListener('mouseleave', onLifeViewPanEnd);
}

// Zoom handler for life view with orthographic camera
function onLifeViewZoom(event) {
  if (state.currentView !== 'life' || state.transitioning) return;
  
  event.preventDefault();
  
  // Calculate zoom delta - scale based on wheel movement
  const zoomDelta = event.deltaY * 0.001;
  
  // Apply zoom limits
  state.lifeViewControls.zoomLevel = Math.max(0.5, Math.min(5, state.lifeViewControls.zoomLevel + zoomDelta));
  
  // Update orthographic camera zoom
  const newFrustumSize = 10 / state.lifeViewControls.zoomLevel;
  const aspect = window.innerWidth / window.innerHeight;
  
  camera.left = newFrustumSize * aspect / -2;
  camera.right = newFrustumSize * aspect / 2;
  camera.top = newFrustumSize / 2;
  camera.bottom = newFrustumSize / -2;
  camera.updateProjectionMatrix();
  
  console.log(`Zoom level: ${state.lifeViewControls.zoomLevel}`);
}

// Pan start handler for life view
function onLifeViewPanStart(event) {
  if (state.currentView !== 'life' || state.transitioning) return;
  
  state.lifeViewControls.panning = true;
  state.lifeViewControls.lastMouseX = event.clientX;
  state.lifeViewControls.lastMouseY = event.clientY;
}

// Pan move handler for life view
function onLifeViewPanMove(event) {
  if (!state.lifeViewControls.panning) return;
  
  // Calculate mouse movement
  const deltaX = event.clientX - state.lifeViewControls.lastMouseX;
  const deltaY = event.clientY - state.lifeViewControls.lastMouseY;
  
  // Update last mouse position
  state.lifeViewControls.lastMouseX = event.clientX;
  state.lifeViewControls.lastMouseY = event.clientY;
  
  // Calculate pan amount in world units
  const panSpeed = 0.005 / state.lifeViewControls.zoomLevel;
  state.lifeViewControls.panOffset.x += deltaX * panSpeed;
  state.lifeViewControls.panOffset.y -= deltaY * panSpeed;
  
  // Apply pan to camera
  camera.position.x = -state.lifeViewControls.panOffset.x;
  camera.position.y = -state.lifeViewControls.panOffset.y;
  
  // Update camera target
  controls.target.set(
    -state.lifeViewControls.panOffset.x,
    -state.lifeViewControls.panOffset.y,
    0
  );
}

// Pan end handler for life view
function onLifeViewPanEnd() {
  state.lifeViewControls.panning = false;
}

// Create Day View
function createDayView() {
  // Parse the day template to create blocks
  const blocks = parseDayTemplate(state.dayTemplate);
  
  // Clear existing blocks first
  while(dayViewGroup.children.length > 0) {
    dayViewGroup.remove(dayViewGroup.children[0]);
  }
  
  console.log(`Creating ${blocks.length} day blocks`);
  
  // Create timeline
  const timelineHeight = 10; // Height of the full day in 3D units
  const hourHeight = timelineHeight / 24; // Height per hour
  
  // Add a subtle background plane
  const backgroundGeometry = new THREE.PlaneGeometry(5, timelineHeight + 1);
  const backgroundMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x222222, // Darker background for day view
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  const backgroundPlane = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
  backgroundPlane.position.z = -0.1;
  dayViewGroup.add(backgroundPlane);
  
  blocks.forEach(block => {
    const startHour = getHourFromTimeString(block.startTime);
    const endHour = getHourFromTimeString(block.endTime);
    const duration = endHour - startHour;
    
    // Handle overnight blocks (when end time is less than start time)
    const adjustedDuration = duration < 0 ? duration + 24 : duration;
    
    // Create block mesh
    const blockHeight = adjustedDuration * hourHeight;
    const blockWidth = 3;
    const blockDepth = 0.1;
    
    // Generate a color based on the block type
    const blockColor = getBlockColor(block.title);
    
    // Create rounded box alternative - using group of objects for the rounded effect
    const blockGroup = new THREE.Group();
    
    // Main block
    const mainGeometry = new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth);
    const mainMaterial = new THREE.MeshStandardMaterial({
      color: blockColor,
      metalness: 0.1,
      roughness: 0.7
    });
    const mainBlock = new THREE.Mesh(mainGeometry, mainMaterial);
    blockGroup.add(mainBlock);
    
    // Rounded corner cylinders
    const radius = 0.1; // 4px equivalent in 3D space
    const cornerPositions = [
      [-blockWidth/2 + radius, blockHeight/2 - radius, 0], // top-left
      [blockWidth/2 - radius, blockHeight/2 - radius, 0],  // top-right
      [-blockWidth/2 + radius, -blockHeight/2 + radius, 0], // bottom-left
      [blockWidth/2 - radius, -blockHeight/2 + radius, 0]  // bottom-right
    ];
    
    cornerPositions.forEach(pos => {
      const cornerGeometry = new THREE.CylinderGeometry(radius, radius, blockDepth, 8);
      cornerGeometry.rotateX(Math.PI / 2); // Rotate cylinder to align with block depth
      const corner = new THREE.Mesh(cornerGeometry, mainMaterial);
      corner.position.set(pos[0], pos[1], 0);
      blockGroup.add(corner);
    });
    
    // Position block on timeline
    const yPos = -(startHour + adjustedDuration / 2) * hourHeight + timelineHeight / 2;
    blockGroup.position.set(0, yPos, 0);
    
    // Add block title
    const blockTitle = createTextMesh(block.title, 0.2);
    blockTitle.position.set(0, blockHeight / 2 - 0.3, blockDepth / 2 + 0.01);
    blockGroup.add(blockTitle);
    
    // Add time label
    const timeLabel = createTextMesh(`${block.startTime} - ${block.endTime}`, 0.15);
    timeLabel.position.set(0, -blockHeight / 2 + 0.2, blockDepth / 2 + 0.01);
    blockGroup.add(timeLabel);
    
    dayViewGroup.add(blockGroup);
  });
  
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
  timeIndicator.position.z = 0.15; // Increased z-position to be in front of blocks
  dayViewGroup.add(timeIndicator);
  dayViewGroup.userData.timeIndicator = timeIndicator;
  
  // Hide initially
  dayViewGroup.visible = false;
  dayViewGroup.position.z = 0; // Position at the origin
  
  // Add hour markers
  for (let hour = 0; hour <= 24; hour += 3) {
    const hourMarkerGeometry = new THREE.PlaneGeometry(3.5, 0.02);
    const hourMarkerMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x444444, 
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide 
    });
    const hourMarker = new THREE.Mesh(hourMarkerGeometry, hourMarkerMaterial);
    
    const yPos = -hour * hourHeight + timelineHeight / 2;
    hourMarker.position.set(0, yPos, -0.05);
    
    dayViewGroup.add(hourMarker);
    
    // Add hour text - larger size
    const hourText = createTextMesh(formatHour(hour), 0.15);
    hourText.position.set(-2, yPos, 0.01);
    dayViewGroup.add(hourText);
  }
}

// Helper function to format hour (12-hour format)
function formatHour(hour) {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

// Helper function: Get color based on block title
function getBlockColor(title) {
  // New color palette
  const colorMap = {
    'Morning Routine': 0x664d00, // field-drab
    'Work': 0x6e2a0c,            // seal-brown
    'Work Session': 0x6e2a0c,     // seal-brown
    'Lunch': 0x691312,            // rosewood
    'Lunch Break': 0x691312,      // rosewood
    'Exercise': 0x291938,         // dark-purple
    'Dinner': 0x042d3a,           // gunmetal
    'Personal': 0x12403c,         // brunswick-green
    'Personal Time': 0x12403c,    // brunswick-green
    'Sleep': 0x475200            // dark-moss-green
  };
  
  // Additional mappings for specific block titles
  if (title.includes('Work Session 1')) return 0x6e2a0c; // seal-brown
  if (title.includes('Work Session 2')) return 0x5d0933; // tyrian-purple
  
  // Check if the title contains any of the keys
  for (const [key, color] of Object.entries(colorMap)) {
    if (title.includes(key)) {
      return color;
    }
  }
  
  // Default color
  return 0x12403c; // brunswick-green as default
}

// Helper function: Create text mesh
function createTextMesh(text, size) {
  // In a full implementation, we would use TextGeometry from Three.js
  // For simplicity, we'll create a placeholder plane with metadata
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, size * 3), // Make base geometry 3x larger
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
  );
  plane.userData.text = text;
  plane.userData.textSize = size * 3; // Store 3x larger size
  
  // In production, replace this with actual TextGeometry
  // For now we'll display the text using HTML overlay in updateLabels()
  
  return plane;
}

// Parse the day template to extract blocks with titles, times, and descriptions
function parseDayTemplate(template) {
  const blocks = [];
  
  // Split by section markers (# titles)
  const sections = template.split('\n#').map((section, index) => 
    index === 0 ? section : '#' + section
  );
  
  sections.forEach(section => {
    // Skip empty sections
    if (!section.trim()) return;
    
    // Split section into lines
    const lines = section.trim().split('\n');
    
    // Extract title (remove leading #)
    const title = lines[0].startsWith('#') ? 
      lines[0].substring(1).trim() : 
      lines[0].trim();
    
    // Extract time range (second line)
    const timeRange = lines.length > 1 ? lines[1].trim() : '';
    
    // Extract description (all remaining lines after the time)
    const description = lines.length > 2 ? 
      lines.slice(2).join('\n').trim() : 
      '';
    
    // Only add if we have a title and time range
    if (title && timeRange) {
      // Parse the time range
      const [startTime, endTime] = timeRange.split('-').map(t => t.trim());
      
      blocks.push({
        title,
        startTime,
        endTime,
        description
      });
    }
  });
  
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
  
  // Find the current day cube for zoom target
  let currentDayCube;
  lifeViewGroup.children.forEach(child => {
    if (child.userData.isCurrent) {
      currentDayCube = child;
    }
  });
  
  if (!currentDayCube) {
    console.error("No current day cube found");
    return;
  }
  
  // Starting camera position
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  
  // Target position - straight in front of the day view
  const targetPos = new THREE.Vector3(0, 0, 4); // Position directly in front
  
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
    
    // Update controls target to center of day view
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
      
      // Ensure camera is positioned directly in front of the day view
      camera.position.set(0, 0, 4);
      controls.target.set(0, 0, 0);
      controls.update();
      
      console.log("Transition to day complete");
    }
    
    renderer.render(scene, camera);
  }
  
  requestAnimationFrame(animateTransition);
}

// Transition from Day view back to Life view
function transitionToLife() {
  if (state.transitioning) return;
  
  console.log("Transitioning to life view");
  
  state.transitioning = true;
  controls.enabled = false;
  
  // Find the current day cube for zoom target
  let currentDayCube;
  lifeViewGroup.children.forEach(child => {
    if (child.userData.isCurrent) {
      currentDayCube = child;
    }
  });
  
  if (!currentDayCube) {
    console.error("No current day cube found");
    return;
  }
  
  // Starting camera position
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  
  // Target position (zoomed out to the life view)
  const targetPos = new THREE.Vector3(0, 0, 5);
  
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
      if (!lifeViewGroup.visible) {
        console.log("Making life view visible");
        dayViewGroup.visible = false;
        lifeViewGroup.visible = true;
      }
    }
    
    if (progress < 1) {
      requestAnimationFrame(animateTransition);
    } else {
      // Animation complete
      state.currentView = 'life';
      state.transitioning = false;
      controls.enabled = false; // Ensure controls are disabled in life view
      console.log("Transition to life complete");
    }
    
    renderer.render(scene, camera);
  }
  
  requestAnimationFrame(animateTransition);
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
  // Create back button
  const backButton = document.createElement('button');
  backButton.textContent = '← Back';
  backButton.className = 'back-button';
  backButton.style.display = 'none';
  backButton.addEventListener('click', () => {
    if (state.currentView === 'day' && !state.transitioning) {
      transitionToLife();
    }
  });
  document.body.appendChild(backButton);
  
  // Create current time display
  const timeDisplay = document.createElement('div');
  timeDisplay.className = 'time-display';
  timeDisplay.style.display = 'none';
  document.body.appendChild(timeDisplay);
  
  // Create description panel for day view
  const descriptionPanel = document.createElement('div');
  descriptionPanel.className = 'description-panel';
  descriptionPanel.style.display = 'none';
  document.body.appendChild(descriptionPanel);
  
  // Store references
  state.htmlOverlays = {
    backButton,
    timeDisplay,
    descriptionPanel
  };
}

// Update HTML overlay labels
function updateLabels() {
  if (!state.htmlOverlays) return;
  
  const { backButton, timeDisplay, descriptionPanel } = state.htmlOverlays;
  
  if (state.currentView === 'day') {
    // Show back button in day view
    backButton.style.display = 'block';
    timeDisplay.style.display = 'block';
    
    // Get or create the labels container for block title and time labels
    let labelsContainer = document.getElementById('labels-container');
    
    if (!labelsContainer) {
      labelsContainer = document.createElement('div');
      labelsContainer.id = 'labels-container';
      labelsContainer.style.position = 'absolute';
      labelsContainer.style.top = '0';
      labelsContainer.style.left = '0';
      labelsContainer.style.width = '100%';
      labelsContainer.style.height = '100%';
      labelsContainer.style.pointerEvents = 'none';
      document.body.appendChild(labelsContainer);
    } else {
      // Clear existing text labels but keep the container
      labelsContainer.innerHTML = '';
    }
    
    // Update current time display
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timeDisplay.textContent = `${hours}:${minutes}`;
    
    // Calculate current hour for finding the relevant block
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const blocks = parseDayTemplate(state.dayTemplate);
    
    // Find the block that contains the current time
    const currentBlock = blocks.find(block => {
      const startHour = getHourFromTimeString(block.startTime);
      let endHour = getHourFromTimeString(block.endTime);
      
      // Handle overnight blocks
      if (endHour < startHour) {
        endHour += 24;
      }
      
      return currentHour >= startHour && currentHour < endHour;
    });
    
    // Update all text labels on the timeline blocks
    dayViewGroup.traverse((object) => {
      if (object.userData && object.userData.text) {
        const screenPosition = getScreenPosition(object);
        
        // Skip if the object is behind the camera or too far to the sides
        if (screenPosition.behind || 
            screenPosition.x < 0 || 
            screenPosition.x > window.innerWidth || 
            screenPosition.y < 0 || 
            screenPosition.y > window.innerHeight) {
          return;
        }
        
        const label = document.createElement('div');
        label.textContent = object.userData.text;
        label.style.position = 'absolute';
        label.style.left = `${screenPosition.x}px`;
        label.style.top = `${screenPosition.y}px`;
        label.style.fontSize = `${object.userData.textSize * 40}px`; // Use stored 3x size
        label.style.fontFamily = 'Inter, sans-serif';
        label.style.color = 'white'; // Text color
        label.style.transform = 'translate(-50%, -50%)';
        label.style.textAlign = 'center';
        label.style.fontWeight = 'bold';
        label.style.pointerEvents = 'none';
        label.style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.7)'; // Shadow for readability
        
        labelsContainer.appendChild(label);
      }
    });
    
    // Position and update the description panel for the current time block
    if (currentBlock && currentBlock.description) {
      // Calculate position based on current time
      const timelineHeight = 10;
      const hourHeight = timelineHeight / 24;
      const yPos = -currentHour * hourHeight + timelineHeight / 2;
      
      // Calculate the center position of the timeline
      const timelineCenter = new THREE.Vector3(0, yPos, 0.15);
      timelineCenter.applyMatrix4(dayViewGroup.matrixWorld);
      timelineCenter.project(camera);
      
      // Calculate the right edge of the timeline (approx. 4 units width)
      const timelineActualWidth = 4;
      const timelineRightEdge = new THREE.Vector3(timelineActualWidth/2, yPos, 0.15);
      timelineRightEdge.applyMatrix4(dayViewGroup.matrixWorld);
      timelineRightEdge.project(camera);
      
      // Calculate screen positions
      const screenY = ((-timelineCenter.y + 1) / 2) * window.innerHeight;
      const edgeScreenX = ((timelineRightEdge.x + 1) / 2) * window.innerWidth;
      
      // Position the description panel 100px to the right of the timeline edge
      descriptionPanel.style.top = `${screenY}px`;
      descriptionPanel.style.left = `${edgeScreenX + 100}px`;
      descriptionPanel.style.transform = 'translateY(-50%)';
      
      // Update panel content
      descriptionPanel.innerHTML = `
        <h2>${currentBlock.title}</h2>
        <div class="time-range">${currentBlock.startTime} - ${currentBlock.endTime}</div>
        <div class="description">${currentBlock.description.replace(/\n/g, '<br>')}</div>
      `;
      descriptionPanel.style.display = 'block';
    } else {
      descriptionPanel.style.display = 'none';
    }
  } else {
    // Hide elements in life view
    backButton.style.display = 'none';
    timeDisplay.style.display = 'none';
    descriptionPanel.style.display = 'none';
    
    // Hide labels container if it exists
    const labelsContainer = document.getElementById('labels-container');
    if (labelsContainer) {
      labelsContainer.innerHTML = '';
    }
  }
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

// Window resize handler - updated for orthographic camera
function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  
  if (camera.isOrthographicCamera) {
    // For orthographic camera
    const frustumSize = 10 / state.lifeViewControls.zoomLevel;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
  } else {
    // For perspective camera (day view)
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Only enable controls in day view
  controls.enabled = (state.currentView === 'day' && !state.transitioning);
  
  // Update controls only if enabled
  if (controls.enabled) {
    controls.update();
  }
  
  // Animate current day point light if in life view
  if (state.currentView === 'life' && lifeViewGroup.userData.currentDayLight) {
    const light = lifeViewGroup.userData.currentDayLight;
    
    // Update pulse phase
    light.userData.pulsePhase = (light.userData.pulsePhase + 0.02) % (Math.PI * 2);
    
    // Calculate intensity factor (between 0.5 and 1.5)
    const intensityFactor = 1 + 0.5 * Math.sin(light.userData.pulsePhase);
    
    // Apply intensity
    light.intensity = 2 * intensityFactor;
    
    // Optionally change color slightly
    const hue = 0.6 + 0.05 * Math.sin(light.userData.pulsePhase); // Blue hue with slight variation
    light.color.setHSL(hue, 0.8, 0.5);
  }
  
  // Update time indicator in day view
  if (state.currentView === 'day' && dayViewGroup.visible) {
    updateTimeIndicator();
    updateLabels();
  }
  
  // Update debug label positions if debug mode is on
  if (state.debugMode) {
    updateDebugLabelPositions();
  }
  
  // Render scene
  renderer.render(scene, camera);
}

// Function to add debug labels showing row,column coordinates
function addDebugLabel(cube, text) {
  const position = cube.position.clone();
  
  // Create HTML label
  const label = document.createElement('div');
  label.className = 'debug-label';
  label.textContent = text;
  label.style.position = 'absolute';
  label.style.color = 'red';
  label.style.fontSize = '10px';
  label.style.fontFamily = 'monospace';
  label.style.fontWeight = 'bold';
  label.style.pointerEvents = 'none';
  label.style.zIndex = '1000';
  label.style.backgroundColor = 'rgba(0,0,0,0.5)';
  label.style.padding = '2px';
  label.style.userSelect = 'none';
  
  // Store the 3D position with the label
  label.dataset.x = position.x;
  label.dataset.y = position.y;
  label.dataset.z = position.z;
  
  // Add to document
  document.body.appendChild(label);
  
  // Update its position
  updateDebugLabelPosition(label);
}

// Function to update debug label positions
function updateDebugLabelPositions() {
  if (!state.debugMode) return;
  
  const labels = document.querySelectorAll('.debug-label');
  labels.forEach(updateDebugLabelPosition);
}

// Update a single debug label's position
function updateDebugLabelPosition(label) {
  const position = new THREE.Vector3(
    parseFloat(label.dataset.x),
    parseFloat(label.dataset.y),
    parseFloat(label.dataset.z)
  );
  
  // Project position to screen coordinates
  position.project(camera);
  
  // Convert to CSS coordinates
  const x = (position.x * 0.5 + 0.5) * window.innerWidth;
  const y = (position.y * -0.5 + 0.5) * window.innerHeight;
  
  // Only show if in front of camera
  if (position.z < 1) {
    label.style.display = 'block';
    label.style.transform = `translate(-50%, -50%)`;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  } else {
    label.style.display = 'none';
  }
}

// Clear all debug labels
function clearDebugLabels() {
  const labels = document.querySelectorAll('.debug-label');
  labels.forEach(label => label.remove());
}

// Toggle debug mode
function toggleDebugMode() {
  state.debugMode = !state.debugMode;
  console.log(`Debug mode: ${state.debugMode ? 'ON' : 'OFF'}`);
  
  if (state.debugMode) {
    // Recreate the life view with debug labels
    createLifeView();
  } else {
    // Clear debug labels
    clearDebugLabels();
  }
}

// Function to zoom out and view the entire grid
function viewEntireGrid() {
  if (state.currentView !== 'life' || state.transitioning) return;
  
  console.log('Zooming out to view entire grid');
  
  // Calculate actual grid dimensions for proper centering
  const baseUnit = 0.05;
  const blockSize = baseUnit;
  const horizontalSpacing = baseUnit * 3;
  const verticalSpacing = baseUnit * 3;
  
  const daysPerRow = 365;
  const rows = 90; // years
  
  // Calculate total grid dimensions
  const totalWidth = daysPerRow * (blockSize + horizontalSpacing);
  const totalHeight = rows * (blockSize + verticalSpacing);
  
  // Calculate the actual center of the grid
  // Center X is 0 since the grid is centered horizontally
  // Center Y is -totalHeight/2 + rows showing above center * row height
  const rowsToShowAboveCenter = 35; // Show about 35 years above center (adjust as needed)
  const centerX = 0;
  const centerY = -totalHeight/2 + rowsToShowAboveCenter * (blockSize + verticalSpacing);
  
  // Use a moderate zoom level that shows a good portion of the grid
  // but still allows further zooming without issues
  const targetZoom = 0.33; // More moderate zoom
  
  // Create animation for smooth transition
  const startPos = camera.position.clone();
  const startZoom = state.lifeViewControls.zoomLevel;
  const duration = 1000; // ms
  const startTime = Date.now();
  
  function animateZoomOut() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Use easing function for smooth transition
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
    
    // Update camera position
    camera.position.x = startPos.x + (centerX - startPos.x) * easeProgress;
    camera.position.y = startPos.y + (centerY - startPos.y) * easeProgress;
    
    // Update zoom level
    const newZoom = startZoom + (targetZoom - startZoom) * easeProgress;
    state.lifeViewControls.zoomLevel = newZoom;
    
    // Update camera frustum for orthographic camera
    const newFrustumSize = 10 / newZoom;
    const aspect = window.innerWidth / window.innerHeight;
    
    camera.left = newFrustumSize * aspect / -2;
    camera.right = newFrustumSize * aspect / 2;
    camera.top = newFrustumSize / 2;
    camera.bottom = newFrustumSize / -2;
    camera.updateProjectionMatrix();
    
    // Update controls target
    controls.target.x = centerX;
    controls.target.y = centerY;
    controls.target.z = 0;
    
    // Update pan offset
    state.lifeViewControls.panOffset.x = -centerX;
    state.lifeViewControls.panOffset.y = -centerY;
    
    if (progress < 1) {
      requestAnimationFrame(animateZoomOut);
    } else {
      console.log('View entire grid complete - zoom level: ' + targetZoom);
    }
  }
  
  // Start animation
  animateZoomOut();
}

// Initialize
async function init() {
  // Show loading screen
  const loadingScreen = document.querySelector('.loading-screen')
  
  // Create life view first
  createLifeView()
  
  // Load day template and create day view
  await loadDayTemplate()
  
  // Create HTML overlays after views are ready
  createHTMLOverlays()
  
  // Camera is now positioned by createLifeView
  controls.enableRotate = false; // Disable rotation permanently
  
  // Event listeners
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('click', onMouseClick)
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    // Toggle debug mode with 'd' key
    if (event.key === 'd' || event.key === 'D') {
      toggleDebugMode();
    }
    
    // Transition to day view with 't' key
    if (event.key === 't' || event.key === 'T') {
      if (state.currentView === 'life' && !state.transitioning) {
        console.log('Transitioning to day view via keyboard shortcut');
        transitionToDay();
      }
    }
    
    // Zoom out to see entire grid with 'a' key
    if (event.key === 'a' || event.key === 'A') {
      viewEntireGrid();
    }
  });
  
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
        if (state.currentView !== 'life') return;
        
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
  
  // Add debug toggle button
  const debugButton = document.createElement('button');
  debugButton.textContent = 'Toggle Debug Grid';
  debugButton.style.position = 'fixed';
  debugButton.style.bottom = '50px';
  debugButton.style.right = '10px';
  debugButton.style.zIndex = '1000';
  debugButton.addEventListener('click', toggleDebugMode);
  document.body.appendChild(debugButton);
  
  // Add keyboard shortcut for debug mode (press 'D')
  document.addEventListener('keydown', (event) => {
    if (event.key === 'd' || event.key === 'D') {
      toggleDebugMode();
    }
  });
}

init()
