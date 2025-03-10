let airQualityData = [];
let currentView = 'time'; // 'time', 'comparison'
let selectedState = null;
let selectedCity = null;
let selectedPollutant = 'O3 AQI'; // Default pollutant
let selectedCities = []; // For comparing multiple cities
let selectedPollutants = []; // For comparing multiple pollutants
let timeRange = [0, 100]; // Percentage of time range to display
let margin = 60;
let uniqueStates = [];
let uniqueCities = [];
let uniquePollutants = ['O3 AQI', 'CO AQI', 'SO2 AQI', 'NO2 AQI'];
let colorScale;
let startSliderX, endSliderX;
let startLocked = false, endLocked = false;
let buttonD = 20; // Diameter of slider buttons
let sliderY; // Y position of the slider
let minYearMonth, maxYearMonth; // To store min and max dates
let dateFormat = []; // To store formatted dates for display

// Sample data to use if CSV loading fails
const sampleData = [
  { state: 'Arizona', city: 'Phoenix', date: '2000-01-01', o3: 37, co: 25, so2: 13, no2: 46 },
  { state: 'Arizona', city: 'Phoenix', date: '2000-01-02', o3: 30, co: 26, so2: 4, no2: 34 },
  { state: 'Arizona', city: 'Phoenix', date: '2000-02-01', o3: 42, co: 28, so2: 18, no2: 51 },
  { state: 'Arizona', city: 'Phoenix', date: '2000-03-01', o3: 45, co: 30, so2: 20, no2: 55 },
  { state: 'Arizona', city: 'Tucson', date: '2000-01-01', o3: 32, co: 20, so2: 10, no2: 40 },
  { state: 'Arizona', city: 'Tucson', date: '2000-02-01', o3: 36, co: 22, so2: 12, no2: 42 },
  { state: 'California', city: 'Los Angeles', date: '2000-01-01', o3: 50, co: 35, so2: 22, no2: 60 },
  { state: 'California', city: 'Los Angeles', date: '2000-02-01', o3: 55, co: 40, so2: 25, no2: 65 },
  { state: 'California', city: 'San Francisco', date: '2000-01-01', o3: 30, co: 18, so2: 8, no2: 38 },
  { state: 'California', city: 'San Francisco', date: '2000-02-01', o3: 32, co: 20, so2: 10, no2: 40 },
  // Adding data for 2001
  { state: 'Arizona', city: 'Phoenix', date: '2001-01-01', o3: 39, co: 27, so2: 15, no2: 48 },
  { state: 'Arizona', city: 'Phoenix', date: '2001-02-01', o3: 44, co: 30, so2: 20, no2: 53 },
  { state: 'California', city: 'Los Angeles', date: '2001-01-01', o3: 52, co: 37, so2: 24, no2: 62 },
  { state: 'California', city: 'San Francisco', date: '2001-01-01', o3: 32, co: 20, so2: 10, no2: 40 }
];

let dataLoadError = false;

function preload() {
  try {
    airQualityData = loadTable('pollution_2000_2023.csv', 'csv', 'header');
  } catch (error) {
    console.error('Error loading data:', error);
    dataLoadError = true;
  }
}

// Function to create a Table from sample data if CSV loading fails
function createTableFromSampleData() {
  let table = new p5.Table();
  
  // Add columns
  table.addColumn('s.no');
  table.addColumn('Date');
  table.addColumn('Address');
  table.addColumn('State');
  table.addColumn('County');
  table.addColumn('City');
  table.addColumn('O3 AQI');
  table.addColumn('CO AQI');
  table.addColumn('SO2 AQI');
  table.addColumn('NO2 AQI');
  
  // Add rows from sample data
  sampleData.forEach((item, index) => {
    let newRow = table.addRow();
    newRow.setNum('s.no', index);
    newRow.setString('Date', item.date);
    newRow.setString('Address', 'Sample Address');
    newRow.setString('State', item.state);
    newRow.setString('County', 'Sample County');
    newRow.setString('City', item.city);
    newRow.setNum('O3 AQI', item.o3);
    newRow.setNum('CO AQI', item.co);
    newRow.setNum('SO2 AQI', item.so2);
    newRow.setNum('NO2 AQI', item.no2);
  });
  
  return table;
}

// Define a more aesthetically pleasing color palette
const colors = {
  background: '#f0f5f9',
  primary: '#3498db',
  secondary: '#1abc9c',
  accent: '#9b59b6',
  text: '#2c3e50',
  lightGray: '#ecf0f1',
  midGray: '#bdc3c7',
  darkGray: '#7f8c8d',
  graphBackground: '#ffffff',
  goodAQI: '#1abc9c',  // Teal
  moderateAQI: '#f1c40f', // Yellow
  unhealthyAQI: '#e74c3c'  // Red
};

function setup() {
  createCanvas(1200, 800);
  textAlign(LEFT, CENTER);
  
  // Set default font and text properties
  textFont('Arial, sans-serif');
  
  // Check if we need to use sample data
  if (dataLoadError || !airQualityData || !airQualityData.getRowCount) {
    console.log('Using sample data due to CSV loading error');
    airQualityData = createTableFromSampleData();
  }

  // Process data
  processData();
  
  // Initialize color scale first with more colors for a smoother gradient
  colorScale = createColorScale([
    colors.goodAQI, 
    '#2ecc71', // Light green
    '#f1c40f', // Yellow
    '#e67e22', // Orange
    colors.unhealthyAQI
  ]); 

  // Create UI elements
  createUI();

  // Setup time slider
  setupTimeSlider();
}

function processData() {
  // Extract unique states and cities
  uniqueStates = [];
  uniqueCities = [];

  try {
    for (let i = 0; i < airQualityData.getRowCount(); i++) {
      let state = airQualityData.getString(i, 'State');
      let city = airQualityData.getString(i, 'City');

      if (!uniqueStates.includes(state)) uniqueStates.push(state);
      if (!uniqueCities.includes(city)) uniqueCities.push(city);
    }

    // Sort states and cities alphabetically
    uniqueStates.sort();
    uniqueCities.sort();
  } catch (error) {
    console.error('Error processing data:', error);
    // Use states and cities from sample data as a fallback
    let stateSet = new Set();
    let citySet = new Set();
    
    sampleData.forEach(item => {
      stateSet.add(item.state);
      citySet.add(item.city);
    });
    
    uniqueStates = Array.from(stateSet).sort();
    uniqueCities = Array.from(citySet).sort();
  }
}

// Store UI references globally
let stateSelect, citySelect, pollutantSelect;

function createUI() {
  // Create UI elements in setup phase - this separation ensures they're properly initialized
  
  // Create state selector
  stateSelect = createSelect();
  stateSelect.position(margin + 50, 20);
  stateSelect.size(100, 25);
  stateSelect.style('font-size', '12px');
  stateSelect.style('z-index', '10'); // Ensure dropdowns appear above canvas elements
  stateSelect.option('Select State');
  uniqueStates.forEach(state => stateSelect.option(state));
  stateSelect.changed(() => {
    selectedState = stateSelect.value();
    updateCityDropdown();
  });

  // Create city selector
  citySelect = createSelect();
  citySelect.position(margin + 200, 20);
  citySelect.size(100, 25);
  citySelect.style('font-size', '12px');
  citySelect.style('z-index', '10');
  citySelect.option('Select City');
  citySelect.changed(() => {
    selectedCity = citySelect.value();
  });

  // Create pollutant selector
  pollutantSelect = createSelect();
  pollutantSelect.position(margin + 370, 20);
  pollutantSelect.size(100, 25);
  pollutantSelect.style('font-size', '12px');
  pollutantSelect.style('z-index', '10');
  uniquePollutants.forEach(pollutant => pollutantSelect.option(pollutant));
  pollutantSelect.changed(() => {
    selectedPollutant = pollutantSelect.value();
  });
}

function drawUIElements() {
  // Draw UI container with background
  fill(colors.lightGray);
  stroke(colors.midGray);
  strokeWeight(1);
  rect(margin, 10, width - 2 * margin, 60, 10);
  
  // Add labels for each selector
  fill(colors.text);
  noStroke();
  textSize(12);
  textAlign(LEFT, CENTER);
  text("State:", margin + 10, 25);
  text("City:", margin + 160, 25);
  text("Pollutant:", margin + 310, 25);
  
  // Create legend for AQI colors
  let legendX = margin + 500;
  let legendY = 35;
  let legendWidth = 200;
  let legendHeight = 15;
  
  // Draw legend title
  text("AQI Level:", legendX, legendY - 10);
  
  // Draw color gradient background first
  noStroke();
  for (let i = 0; i < legendWidth; i++) {
    let ratio = i / legendWidth;
    let legendColor = colorScale.getColor(ratio, 0, 1);
    fill(legendColor);
    rect(legendX + i, legendY, 1, legendHeight);
  }
  
  // Add a border around the legend
  noFill();
  stroke(colors.midGray);
  strokeWeight(1);
  rect(legendX, legendY, legendWidth, legendHeight);
  
  // Draw legend labels
  noStroke();
  fill(colors.text);
  textAlign(CENTER, CENTER);
  textSize(10);
  text("Good", legendX, legendY + legendHeight + 10);
  text("Moderate", legendX + legendWidth/2, legendY + legendHeight + 10);
  text("Unhealthy", legendX + legendWidth, legendY + legendHeight + 10);
}

function setupTimeSlider() {
  // Calculate slider position
  sliderY = height - 80;
  startSliderX = margin;
  endSliderX = width - margin;

  try {
    // Extract and format dates from data
    let dates = [];
    for (let i = 0; i < airQualityData.getRowCount(); i++) {
      let dateStr = airQualityData.getString(i, 'Date');
      let dateParts = dateStr.split('-');
      if (dateParts.length === 3) {
        let year = parseInt(dateParts[0]);
        let month = parseInt(dateParts[1]);
        let dateObj = { month, year, original: dateStr };
        dates.push(dateObj);
      }
    }

    // If no valid dates were found, create sample dates from sample data
    if (dates.length === 0) {
      console.log('No valid dates found in data, using sample dates');
      sampleData.forEach(item => {
        let dateParts = item.date.split('-');
        if (dateParts.length === 3) {
          let year = parseInt(dateParts[0]);
          let month = parseInt(dateParts[1]);
          let dateObj = { month, year, original: item.date };
          dates.push(dateObj);
        }
      });
    }

    // Sort dates chronologically
    dates.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Remove duplicates (keep only unique month/year combinations)
    let uniqueDates = [];
    let seen = new Set();
    for (let date of dates) {
      let key = `${date.month}-${date.year}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueDates.push(date);
      }
    }

    // Store formatted dates and set min/max
    dateFormat = uniqueDates;
    
    if (dateFormat.length > 0) {
      minYearMonth = dateFormat[0];
      maxYearMonth = dateFormat[dateFormat.length - 1];
    } else {
      // Add fallback dates if we somehow have no dates
      dateFormat = [
        { month: 1, year: 2000, original: '2000-01-01' },
        { month: 6, year: 2000, original: '2000-06-01' },
        { month: 1, year: 2001, original: '2001-01-01' },
        { month: 6, year: 2001, original: '2001-06-01' }
      ];
      minYearMonth = dateFormat[0];
      maxYearMonth = dateFormat[dateFormat.length - 1];
    }
  } catch (error) {
    console.error('Error setting up time slider:', error);
    // Create fallback date range
    dateFormat = [
      { month: 1, year: 2000, original: '2000-01-01' },
      { month: 6, year: 2000, original: '2000-06-01' },
      { month: 1, year: 2001, original: '2001-01-01' },
      { month: 6, year: 2001, original: '2001-06-01' }
    ];
    minYearMonth = dateFormat[0];
    maxYearMonth = dateFormat[dateFormat.length - 1];
  }

  // Initialize time range to full range
  timeRange = [0, 100];
}

function drawTimeSlider() {
  // Draw slider background
  fill(220);
  stroke(180);
  strokeWeight(1);
  rect(margin, sliderY - 15, width - 2 * margin, 30, 5);
  
  // Draw slider line
  stroke(0);
  strokeWeight(2);
  line(margin, sliderY, width - margin, sliderY);

  // Draw ticks and labels for major time points
  let sliderWidth = width - 2 * margin;
  textAlign(CENTER, CENTER);
  textSize(10);
  fill(0);
  noStroke();

  // Draw ticks at regular intervals
  let interval = max(1, floor(dateFormat.length / 10)); // Show about 10 ticks
  for (let i = 0; i < dateFormat.length; i += interval) {
    let x = map(i, 0, dateFormat.length - 1, margin, width - margin);
    let date = dateFormat[i];

    // Draw tick
    stroke(0);
    line(x, sliderY - 5, x, sliderY + 5);

    // Draw label
    noStroke();
    push();
    translate(x, sliderY + 15);
    rotate(PI / 4); // Rotate text to avoid overlap
    text(`${date.month}/${date.year}`, 0, 0);
    pop();
  }

  // Draw selected range
  fill(100, 100, 255, 80);
  noStroke();
  rect(startSliderX, sliderY - 10, endSliderX - startSliderX, 20, 5);

  // Draw slider handles with hover effect
  let startHover = dist(mouseX, mouseY, startSliderX, sliderY) < buttonD;
  let endHover = dist(mouseX, mouseY, endSliderX, sliderY) < buttonD;
  
  // Left handle
  stroke(0);
  strokeWeight(1);
  fill(startHover || startLocked ? color(50, 50, 255) : color(0, 0, 255));
  ellipse(startSliderX, sliderY, buttonD, buttonD);
  
  // Right handle
  fill(endHover || endLocked ? color(50, 50, 255) : color(0, 0, 255));
  ellipse(endSliderX, sliderY, buttonD, buttonD);

  // Draw current range text
  let startIdx = floor(map(startSliderX, margin, width - margin, 0, dateFormat.length - 1));
  let endIdx = floor(map(endSliderX, margin, width - margin, 0, dateFormat.length - 1));

  startIdx = constrain(startIdx, 0, dateFormat.length - 1);
  endIdx = constrain(endIdx, 0, dateFormat.length - 1);

  let startDate = dateFormat[startIdx];
  let endDate = dateFormat[endIdx];

  // Draw date range labels with background for better visibility
  fill(255);
  stroke(0);
  strokeWeight(1);
  rect(startSliderX - 40, sliderY - 35, 80, 20, 5);
  rect(endSliderX - 40, sliderY - 35, 80, 20, 5);
  
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(12);
  text(`${startDate.month}/${startDate.year}`, startSliderX, sliderY - 25);
  text(`${endDate.month}/${endDate.year}`, endSliderX, sliderY - 25);

  // Draw slider instructions
  textSize(11);
  fill(80);
  text("Drag sliders to select date range", width/2, sliderY + 30);

  // Update time range percentages for filtering data
  timeRange[0] = map(startSliderX, margin, width - margin, 0, 100);
  timeRange[1] = map(endSliderX, margin, width - margin, 0, 100);
}

function updateCityDropdown() {
  // Make sure the global citySelect is used
  if (!citySelect) return;
  
  // Clear the dropdown by removing all options
  citySelect.elt.innerHTML = ''; // Reset options
  citySelect.option('Select City'); // Add the default option

  try {
    // Use p5.Table's findRows method to filter cities for the selected state
    let filteredRows = airQualityData.findRows(selectedState, 'State');
    let citiesInState = [];

    // Extract unique cities from the filtered rows
    filteredRows.forEach(row => {
      let city = row.getString('City');
      if (!citiesInState.includes(city)) {
        citiesInState.push(city);
      }
    });

    // Sort cities alphabetically
    citiesInState.sort();
    
    // Add cities to the dropdown
    citiesInState.forEach(city => {
      citySelect.option(city);
    });
    
    // Add status message if no cities found
    if (citiesInState.length === 0) {
      citySelect.option('No cities found');
    }
  } catch (error) {
    console.error('Error updating city dropdown:', error);
    // Add a fallback option
    citySelect.option('Error loading cities');
  }
}

function draw() {
  // Use the more pleasing background color
  background(colors.background);
  
  // Draw a decorative header
  noStroke();
  fill(colors.primary);
  rect(0, 0, width, 70, 0, 0, 10, 10);
  
  // Draw title and instructions with better styling
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(24);
  textStyle(BOLD);
  text('Air Quality Data Visualization', width/2, 35);
  
  // Reset text style
  textAlign(LEFT, CENTER);
  textStyle(NORMAL);
  fill(colors.text);
  textSize(14);
  text('Select a state, city, and pollutant to explore the data', margin, 100);
  
  // Add a subtle divider line
  stroke(colors.midGray);
  strokeWeight(1);
  line(margin, 130, width - margin, 130);
  
  // Draw the UI elements (decorative elements behind dropdowns)
  drawUIElements();
  
  // Draw the current view
  if (selectedCity && selectedPollutant) {
    drawTimeSeries();
  } else {
    // Show instruction when no data is selected
    noStroke();
    fill(colors.darkGray);
    textAlign(CENTER, CENTER);
    textSize(16);
    text("Please select a state, city, and pollutant to visualize air quality data", width/2, height/2 - 60);
    
    // Draw a small icon or visual cue with beautiful animation
    let pulse = sin(frameCount * 0.05) * 5; // Pulsing effect
    fill(colors.accent);
    ellipse(width/2, height/2, 40 + pulse, 40 + pulse);
    fill(255);
    textSize(18);
    text("?", width/2, height/2);
  }

  // Draw the time slider
  drawTimeSlider();
}

function drawTimeSeries() {
  // Set up graph dimensions
  let graphX = margin + 50;
  let graphY = margin + 150;
  let graphWidth = width - 2 * margin - 100;
  let graphHeight = height - 2 * margin - 150;

  // Draw graph container with shadow effect
  noStroke();
  fill(210, 210, 210, 80); // Shadow
  rect(graphX + 5, graphY + 5, graphWidth, graphHeight, 8);
  
  // Draw graph background
  fill(colors.graphBackground);
  stroke(colors.midGray);
  strokeWeight(1);
  rect(graphX, graphY, graphWidth, graphHeight, 8);
  
  // Add graph title with styling
  fill(colors.text);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(16);
  text(`${selectedPollutant} Levels in ${selectedCity}, ${selectedState}`, 
       graphX + graphWidth/2, graphY - 30);
  textStyle(NORMAL);

  // Filter data for the selected city and pollutant
  let filteredData = airQualityData.rows.filter(row => {
    return row.getString('City') === selectedCity && row.getString('State') === selectedState;
  });

  // Group data by date
  let dateAQI = {};
  let maxAQI = 0;

  filteredData.forEach(row => {
    let date = row.getString('Date');
    let aqi = row.getNum(selectedPollutant);

    if (!dateAQI[date]) {
      dateAQI[date] = [];
    }
    dateAQI[date].push(aqi);

    if (aqi > maxAQI) {
      maxAQI = aqi;
    }
  });

  // Ensure maxAQI is at least 50 for better visualization
  maxAQI = max(maxAQI, 50);

  // Convert object to sorted array
  let sortedDates = Object.keys(dateAQI).sort((a, b) => new Date(a) - new Date(b));
  let timeSeriesData = sortedDates.map(date => ({
    date: date,
    avgAQI: dateAQI[date].reduce((sum, val) => sum + val, 0) / dateAQI[date].length
  }));

  // Determine index range based on slider
  let startIdx = floor(map(startSliderX, margin, width - margin, 0, timeSeriesData.length - 1));
  let endIdx = floor(map(endSliderX, margin, width - margin, 0, timeSeriesData.length - 1));
  startIdx = constrain(startIdx, 0, timeSeriesData.length - 1);
  endIdx = constrain(endIdx, 0, timeSeriesData.length - 1);
  let visibleData = timeSeriesData.slice(startIdx, endIdx + 1);

  if (visibleData.length === 0) {
    fill(colors.darkGray);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("No data available for this period", graphX + graphWidth / 2, graphY + graphHeight / 2);
    return;
  }

  // Define date-to-timestamp function for mapping
  function dateToTimestamp(dateStr) {
    return new Date(dateStr).getTime();
  }

  // Get timestamp range for mapping
  let startTimestamp = dateToTimestamp(visibleData[0].date);
  let endTimestamp = dateToTimestamp(visibleData[visibleData.length - 1].date);

  // Draw grid lines
  stroke(240);
  strokeWeight(1);
  
  // Horizontal grid lines
  let yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    let y = map(i, 0, yTicks, graphY + graphHeight, graphY);
    line(graphX, y, graphX + graphWidth, y);
  }
  
  // Vertical grid lines
  let xTicks = 10;
  for (let i = 0; i <= xTicks; i++) {
    let x = map(i, 0, xTicks, graphX, graphX + graphWidth);
    line(x, graphY, x, graphY + graphHeight);
  }

  // Draw x-axis
  stroke(colors.darkGray);
  strokeWeight(2);
  line(graphX, graphY + graphHeight, graphX + graphWidth, graphY + graphHeight);
  
  // Draw x-axis labels
  noStroke();
  fill(colors.text);
  textAlign(CENTER);
  textSize(10);

  let dateInterval = max(1, floor(visibleData.length / 5)); // Show about 5 date labels
  for (let i = 0; i < visibleData.length; i += dateInterval) {
    // Map date to x position using p5.js map function
    let timestamp = dateToTimestamp(visibleData[i].date);
    let x = map(timestamp, startTimestamp, endTimestamp, graphX, graphX + graphWidth);
    
    // Draw tick
    stroke(colors.darkGray);
    line(x, graphY + graphHeight, x, graphY + graphHeight + 5);
    
    // Draw date label
    noStroke();
    push();
    translate(x, graphY + graphHeight + 15);
    rotate(PI / 4); // Rotate text to avoid overlap
    text(visibleData[i].date, 0, 0);
    pop();
  }

  // Draw y-axis
  stroke(colors.darkGray);
  strokeWeight(2);
  line(graphX, graphY, graphX, graphY + graphHeight);
  
  // Draw y-axis labels with better formatting
  noStroke();
  fill(colors.text);
  textAlign(RIGHT);
  textSize(10);
  
  for (let i = 0; i <= yTicks; i++) {
    let y = map(i, 0, yTicks, graphY + graphHeight, graphY);
    let value = int(map(i, 0, yTicks, 0, maxAQI));
    
    // Draw tick
    stroke(colors.darkGray);
    line(graphX - 5, y, graphX, y);
    
    // Draw label
    noStroke();
    text(value, graphX - 10, y);
  }

  // Draw axes labels
  fill(colors.text);
  textAlign(CENTER, CENTER);
  textSize(12);
  
  // Y-axis label
  push();
  translate(graphX - 40, graphY + graphHeight/2);
  rotate(-PI/2);
  text("Pollutant Level (AQI)", 0, 0);
  pop();
  
  // X-axis label
  text("Date", graphX + graphWidth/2, graphY + graphHeight + 40);

  // Draw area under the curve with gradient
  for (let i = 0; i < visibleData.length - 1; i++) {
    let point = visibleData[i];
    let nextPoint = visibleData[i+1];
    
    // Calculate positions
    let timestamp = dateToTimestamp(point.date);
    let nextTimestamp = dateToTimestamp(nextPoint.date);
    
    let x1 = map(timestamp, startTimestamp, endTimestamp, graphX, graphX + graphWidth);
    let y1 = map(point.avgAQI, 0, maxAQI, graphY + graphHeight, graphY);
    
    let x2 = map(nextTimestamp, startTimestamp, endTimestamp, graphX, graphX + graphWidth);
    let y2 = map(nextPoint.avgAQI, 0, maxAQI, graphY + graphHeight, graphY);
    
    // Draw a gradient-filled quad
    let color1 = colorScale.getColor(point.avgAQI, 0, maxAQI);
    let color2 = colorScale.getColor(nextPoint.avgAQI, 0, maxAQI);
    
    // Make colors semi-transparent
    color1.setAlpha(100);
    color2.setAlpha(100);
    
    // Draw gradient fill
    noStroke();
    beginShape();
    fill(color1);
    vertex(x1, y1);
    fill(color2);
    vertex(x2, y2);
    vertex(x2, graphY + graphHeight);
    fill(color1);
    vertex(x1, graphY + graphHeight);
    endShape(CLOSE);
  }

  // Draw the line with a beautiful curve and gradient
  noFill();
  strokeWeight(3);
  
  // Create gradient effect for the line
  for (let i = 0; i < visibleData.length - 1; i++) {
    let point = visibleData[i];
    let nextPoint = visibleData[i+1];
    
    // Calculate positions
    let timestamp = dateToTimestamp(point.date);
    let nextTimestamp = dateToTimestamp(nextPoint.date);
    
    let x1 = map(timestamp, startTimestamp, endTimestamp, graphX, graphX + graphWidth);
    let y1 = map(point.avgAQI, 0, maxAQI, graphY + graphHeight, graphY);
    
    let x2 = map(nextTimestamp, startTimestamp, endTimestamp, graphX, graphX + graphWidth);
    let y2 = map(nextPoint.avgAQI, 0, maxAQI, graphY + graphHeight, graphY);
    
    // Get colors based on AQI value
    let color1 = colorScale.getColor(point.avgAQI, 0, maxAQI);
    let color2 = colorScale.getColor(nextPoint.avgAQI, 0, maxAQI);
    
    // Draw line segment with gradient
    drawingContext.lineWidth = 3;
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
    
    let gradient = drawingContext.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    
    drawingContext.strokeStyle = gradient;
    drawingContext.beginPath();
    drawingContext.moveTo(x1, y1);
    drawingContext.lineTo(x2, y2);
    drawingContext.stroke();
  }

  // Draw data points with hover effects
  for (let i = 0; i < visibleData.length; i++) {
    let point = visibleData[i];
    let timestamp = dateToTimestamp(point.date);
    let x = map(timestamp, startTimestamp, endTimestamp, graphX, graphX + graphWidth);
    let y = map(point.avgAQI, 0, maxAQI, graphY + graphHeight, graphY);
    
    // Color points based on AQI level
    let pointColor = colorScale.getColor(point.avgAQI, 0, maxAQI);
    
    // Check if mouse is hovering over point
    let isHovering = dist(mouseX, mouseY, x, y) < 12;
    
    // Draw glow effect for hover
    if (isHovering) {
      noFill();
      stroke(255, 255, 255, 150);
      strokeWeight(2);
      ellipse(x, y, 16, 16);
      
      // Draw outer glow
      stroke(pointColor);
      strokeWeight(1);
      ellipse(x, y, 20, 20);
    }
    
    // Draw data point
    noStroke();
    fill(pointColor);
    ellipse(x, y, isHovering ? 10 : 6, isHovering ? 10 : 6);
    
    // Add tooltip on hover with improved styling
    if (isHovering) {
      // Draw tooltip background with shadow
      fill(40, 40, 40, 200);
      noStroke();
      rect(x + 15, y - 50, 160, 50, 8);
      
      // Draw tooltip content
      fill(255);
      textAlign(LEFT, CENTER);
      textSize(12);
      text(`Date: ${point.date}`, x + 25, y - 35);
      
      // Format AQI value
      textStyle(BOLD);
      text(`${selectedPollutant}: ${nf(point.avgAQI, 0, 1)}`, x + 25, y - 15);
      textStyle(NORMAL);
      
      // Draw connecting line
      stroke(200);
      strokeWeight(1);
      line(x + 5, y, x + 15, y - 25);
    }
  }
  
  // Draw stats box
  if (visibleData.length > 0) {
    // Calculate stats
    let avgAQI = visibleData.reduce((sum, d) => sum + d.avgAQI, 0) / visibleData.length;
    let maxVal = visibleData.reduce((max, d) => d.avgAQI > max ? d.avgAQI : max, 0);
    let minVal = visibleData.reduce((min, d) => d.avgAQI < min ? d.avgAQI : min, Number.MAX_VALUE);
    
    // Draw stats container
    fill(colors.darkGray);
    noStroke();
    rect(graphX + graphWidth - 130, graphY + 10, 120, 80, 5);
    
    // Draw stats content
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(11);
    text(`Average: ${nf(avgAQI, 0, 1)}`, graphX + graphWidth - 120, graphY + 30);
    text(`Maximum: ${nf(maxVal, 0, 1)}`, graphX + graphWidth - 120, graphY + 50);
    text(`Minimum: ${nf(minVal, 0, 1)}`, graphX + graphWidth - 120, graphY + 70);
  }
}

function createColorScale(colors) {
  return {
    getColor: function(value, min, max) {
      let normalizedValue = (value - min) / (max - min);
      normalizedValue = constrain(normalizedValue, 0, 1);
      if (normalizedValue <= 0) return color(colors[0]);
      if (normalizedValue >= 1) return color(colors[colors.length - 1]);

      let segment = normalizedValue * (colors.length - 1);
      let index = floor(segment);
      let t = segment - index;

      let c1 = color(colors[index]);
      let c2 = color(colors[index + 1]);

      return lerpColor(c1, c2, t);
    }
  };
}

function mousePressed() {
  let d1 = dist(mouseX, mouseY, startSliderX, sliderY);
  let d2 = dist(mouseX, mouseY, endSliderX, sliderY);

  if (d1 < buttonD / 2) startLocked = true;
  if (d2 < buttonD / 2) endLocked = true;
}

function mouseDragged() {
  if (startLocked) {
    startSliderX = constrain(mouseX, margin, endSliderX - buttonD);
  }
  if (endLocked) {
    endSliderX = constrain(mouseX, startSliderX + buttonD, width - margin);
  }
}

function mouseReleased() {
  startLocked = false;
  endLocked = false;
}
