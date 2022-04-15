// Time Zone Planner.

// TODO: Make this independent of the styles in tz_conv.css on which it
// currently relies heavily.
var SVG_NS = "http://www.w3.org/2000/svg";

// TODO: This chart is too large. Make it about 2/3 the size.
var CANVAS_HEIGHT   = 800;
var CANVAS_WIDTH    = 800;
var CANVAS_BG_COLOR = "#fff";

var CANVAS_MARGIN = 75;

var OUTER_DIAL_SPECS = {
    radius:     300,
    band_width: 40,
    padding:    15
};

var INNER_DIAL_SPECS = {
    radius:     250,
    band_width: 45,
    padding:    -60 // -1 * (band_width + 15) to position text inside dial 
};

var HOUR_LINE_WIDTH = { min: 2, maj: 6 };

var CIRCLE_ORIG_Y_POS = CANVAS_HEIGHT - OUTER_DIAL_SPECS.radius - CANVAS_MARGIN;

var CIRCLE_MASK_TOP_ID    = 'view-circle-top';
var CIRCLE_MASK_BOTTOM_ID = 'view-circle-bottom';

var TITLE_FONT_SIZE      = 40;
var HOUR_LABEL_FONT_SIZE = 24;

var COLORS = {
    blue:   {light: "#36f", dark: "#339"},
    green:  {light: "#393", dark: "#363"},
    // TODO: Add more color options when I add ability to change default colors.
    // 
    // Not sold on the colors for these last two yet.
    // red:    {light: "#f00", dark: "#900"},
    // yellow: {light: "#ff3", dark: "#cc0"}
};

// TODO: Future improvement, Change the format of this dictionary. Maybe later
// when the dropdown becomes two-dimensional (if there is more than one timezone
// per country).
var TIMEZONES = new TimeZoneList();

// Global variable to store interval ID for current time line drawer.
var currTimeLineIntervalID = null;

// Expect URL to be formatted ...index.html?tz=united_states_new_york&tz=spain_madrid
function getTimezonesFromUrl () {
    const params = (new URL(document.location)).searchParams;
    const timezones = params.getAll("tz");
    return timezones.filter( tz => Object.keys(TIMEZONES).includes(tz) );
}

function drawChart (primTz, secTz) {
    // Set timezones in the URL if they are passed in to the function (as they
    // will be when swapping timezones and selecting a new timezone).
    if (primTz && secTz) {
        // https://stackoverflow.com/a/41542008
        var newRelativePathQuery = window.location.pathname + `?tz=${primTz}&tz=${secTz}`;
        history.pushState(null, '', newRelativePathQuery);
    }

    // Get timezones from URL or fall back to default timezones.
    const timezonesFromUrl = getTimezonesFromUrl();
    primTz = TIMEZONES[ timezonesFromUrl[0] || 'united_states_new_york' ];
    secTz  = TIMEZONES[ timezonesFromUrl[1] || 'spain_madrid' ];

    // Clear an interval if one already exists.
    if (Boolean(currTimeLineIntervalID)) {
        window.clearInterval(currTimeLineIntervalID);
        currTimeLineIntervalID = null;
    }

    // Set the default colors here.
    // TODO: Future improvement, allow picking from a variety of colors.
    primTz.color = COLORS.blue;
    secTz.color  = COLORS.green;

    // Reset the body element so we can draw the chart on a clean slate.
    // I figure this is easier than rotating the two inner dials, changing the
    // titles, spinning the hour labels, etc.
    // TODO: IE seems to choke on this remove() call. Maybe it is because we are
    // trying to remove the body element?
    document.body.remove();
    document.body = document.createElement("body");

    // Draw the svg elements.
    drawSvg(primTz, secTz);

    // Add the html elements after drawing the svg elements.
    addHtmlDialTitles(primTz, secTz, TIMEZONES); // Left.
    
    // Draw the flip-flop button.
    var swapper = document.createElement("div");
    swapper.setAttribute("class", "swapper");
    swapper.setAttribute("style", "top: " + (TITLE_FONT_SIZE * 2) + "px;"
        + "left: " + (CANVAS_MARGIN / 2) + "px;");
    var swapButton = document.createElement("button");
    swapButton.setAttribute("style", "font-size: " + TITLE_FONT_SIZE + "px;");
    swapButton.innerHTML = "&#x21c5;";
    swapper.addEventListener("click", () => drawChart(secTz.key, primTz.key) );
    swapper.appendChild(swapButton);
    document.body.appendChild(swapper);

    document.body.appendChild(buildExplanationText());

    // TODO: Highlight the first dropdown menu when the page first loads, then fade out.
}

function buildExplanationText () {
    var container = document.createElement("div");
    container.setAttribute("class", "explanation");

    var header = document.createElement("h1");
    header.innerHTML = "Time Zone Planner";
    container.appendChild(header);

    var body = [
        "Visualize the difference in local times between different time zones. Useful tool to help plan meetings, phone calls, and travel with friends, family, and coworkers in different time zones.",
        "Click on the blue text to select a different time zone for the outer dial.",
        "Click on the green text to change the innner dial's time zone.",
        "Click on the arrows to swap the inner and outer dials.",
        "The red line on the dials indicates the current time."
    ];
    for (var i = 0; i < body.length; i++) {
        var paragraph = document.createElement("p");
        paragraph.innerHTML = body[i];
        container.appendChild(paragraph);
    }

    return container;
}

function drawSvg (primTz, secTz) {
    var difference = primTz.offset - secTz.offset;

    // Make the base SVG element.
    var canvas = document.createElementNS(SVG_NS, "svg");
    canvas.setAttribute("height", CANVAS_HEIGHT);
    canvas.setAttribute("width", CANVAS_WIDTH);
    canvas.setAttribute("style", "margin-top: " + (TITLE_FONT_SIZE * 3) + "px;");

    // Define clipping paths for day/night distinction in dials.
    var defs = document.createElementNS(SVG_NS, "defs");
    var clipPathTop = makeClipPath(CIRCLE_MASK_TOP_ID, CANVAS_MARGIN);
    var clipPathBottom = makeClipPath(CIRCLE_MASK_BOTTOM_ID, CIRCLE_ORIG_Y_POS);
    defs.appendChild(clipPathTop);
    defs.appendChild(clipPathBottom);
    canvas.appendChild(defs);

    // Draw the left outer dial.
    var leftOuterDial   = makeDial(primTz.color.light, primTz.color.dark, OUTER_DIAL_SPECS);
    var leftOuterLabels = makeHourLabels(CANVAS_WIDTH / 2, CIRCLE_ORIG_Y_POS,
        OUTER_DIAL_SPECS.radius + OUTER_DIAL_SPECS.padding, primTz.color.dark);
    canvas.appendChild(leftOuterDial);
    canvas.appendChild(leftOuterLabels);
    
    // Draw the left inner dial.
    var leftInnerDial = makeDial(secTz.color.light, secTz.color.dark, INNER_DIAL_SPECS);
    rotateDial(leftInnerDial, difference);
    var leftInnerLabels = makeHourLabels(CANVAS_WIDTH / 2, CIRCLE_ORIG_Y_POS,
        INNER_DIAL_SPECS.radius + INNER_DIAL_SPECS.padding, secTz.color.dark, difference);
    // TODO: Can I move the rotation piece out of the label maker?
    canvas.appendChild(leftInnerDial);
    canvas.appendChild(leftInnerLabels);

    // Add the SVG element to the document.
    document.body.appendChild(canvas);

    // Add red line indicating current time to dial.
    addCurrentTimeLine(primTz);
    // Set a global variable so that the interval can be cleared when the chart
    // is redrawn (every minute).
    currTimeLineIntervalID = window.setInterval(addCurrentTimeLine, 60 * 1000, primTz);
}

function addCurrentTimeLine (primTz) {
    var line = document.createElementNS(SVG_NS, "line");

    var xPos = CANVAS_WIDTH / 2;
    var yPos = CIRCLE_ORIG_Y_POS;

    var startDist = INNER_DIAL_SPECS.radius / 2;
    line.setAttribute("x1", xPos + startDist);
    line.setAttribute("y1", yPos + startDist);

    var endDist = OUTER_DIAL_SPECS.radius - (OUTER_DIAL_SPECS.padding * 5);
    line.setAttribute("x2", xPos + endDist);
    line.setAttribute("y2", yPos + endDist);

    line.setAttribute("stroke", "#f00");
    line.setAttribute("stroke-width", 4);
    
    // Rotate the current time line so that it is properly located on the dial.
    var curUTCHour = (new Date()).getUTCHours() + ( (new Date()).getUTCMinutes() / 60 );
    var curPrimTzHour = curUTCHour + primTz.offset;
    // Negative hour indicates that the hour is before midnight.
    curPrimTzHour = (curPrimTzHour < 0) ? 24 + curPrimTzHour : curPrimTzHour;
    // degrees = hours * (360 degrees / 24 hours)
    // Add 45 degrees to the rotation because the line starts (x1, y1) at the
    // circle's origin and extends (x2, y2) its length down and to the right.
    var angle = 45 + curPrimTzHour * 15;
    line.setAttribute("transform", "rotate(" + angle + " " + xPos + " " + yPos + ")");

    var outline = line.cloneNode();
    outline.setAttribute("stroke", "#fff");
    outline.setAttribute("stroke-width", 8);

    var currTimeGroupID = "current_time_line";
    var currTimeGroup = document.createElementNS(SVG_NS, "g");
    currTimeGroup.setAttribute("id", currTimeGroupID);
    currTimeGroup.appendChild(outline);
    currTimeGroup.appendChild(line);

    var canvas = document.body.getElementsByTagName("svg")[0];

    // Remove the current time line if it has already been drawn. The only time
    // we won't find the current time line is the first time the line is drawn
    // after the svg is drawn.
    var svgGroups = canvas.getElementsByTagName("g");
    for (var i = 0; i < svgGroups.length; i++) {
        var group = svgGroups[i];
        if (group.getAttribute("id") == currTimeGroupID) {
            group.remove();
            break; // No use continuing. We've already removed what we came for.
        }
    }
    
    canvas.appendChild(currTimeGroup);
}

// TODO: Remove yPos?
function makeClipPath (id, yPos) {
    var clipRect = document.createElementNS(SVG_NS, "rect");
    // Clipping path spans width of entire svg canvas.
    clipRect.setAttribute("x", 0);
    clipRect.setAttribute("width", CANVAS_WIDTH);
    clipRect.setAttribute("y", yPos);
    clipRect.setAttribute("height", CANVAS_HEIGHT - CIRCLE_ORIG_Y_POS);

    var clipPath = document.createElementNS(SVG_NS, "clipPath");
    clipPath.setAttribute("id", id);
    clipPath.appendChild(clipRect);

    return clipPath;
}

// TODO: Future improvement, should I make a Dial object with a .draw() method?
// function Dial (args) {
//     this.color       = { day: args.light, night: args.dark };
//     this.radius      = args.radius;
//     this.rotateHours = args.rotateHours
//     this.width       = args.width;
//     // Pretty sure this doesn't work. How do I go about using a constructor to
//     // validate the input arguments?
//     this.insideLabels = args.insideLabels ? args.insideLabels : false;
// }
// Dial.prototype.draw = function () { ... }
function makeDial (lightColor, darkColor, dialSpecs, leftMargin) {
    // Default parameters.
    if (typeof(leftMargin) === 'undefined') leftMargin = 0;

    var circleCenterX = CANVAS_WIDTH / 2 + leftMargin;
    var circleCenterY = CIRCLE_ORIG_Y_POS;

    // Draw the circular dials.
    var circleTopHalf = document.createElementNS(SVG_NS, "circle");
    circleTopHalf.setAttribute("cx", circleCenterX);
    circleTopHalf.setAttribute("cy", circleCenterY);

    // Create the white inner circle mask.
    var circleMask = circleTopHalf.cloneNode();
    circleMask.setAttribute("r", dialSpecs.radius - dialSpecs.band_width);
    circleMask.setAttribute("fill", CANVAS_BG_COLOR);

    // Top and bottom halves of the share the same radius.
    circleTopHalf.setAttribute("r", dialSpecs.radius);

    // Create the bottom half of the circle after doing all the common styling.
    var circleBottomHalf = circleTopHalf.cloneNode();
    circleBottomHalf.setAttribute("fill", darkColor);
    circleBottomHalf.setAttribute("clip-path", "url(#" + CIRCLE_MASK_BOTTOM_ID + ")");

    // Now get back to styling the top half of the circle.
    circleTopHalf.setAttribute("fill", lightColor);
    circleTopHalf.setAttribute("clip-path", "url(#" + CIRCLE_MASK_TOP_ID + ")");

    // Draw the hour lines.
    // Add/subtract 1 to ensure hour line covers the edge of the circle.
    var x1 = circleCenterX - dialSpecs.radius - 1;
    var x2 = circleCenterX + dialSpecs.radius + 1;

    // Add the semi-circles to the dial group.
    var dialGroup = document.createElementNS(SVG_NS, "g");
    dialGroup.appendChild(circleTopHalf);
    dialGroup.appendChild(circleBottomHalf);
    dialGroup.appendChild(circleMask);

    // Only draw hour lines for half of the circle since they radiate out
    // from both sides of the center. Angle in degrees.
    for (var angle = 0; angle < 180; angle += 15) {
        var lineWidth = HOUR_LINE_WIDTH.min;
        // Increase the line weight every 3rd hour.
        if (angle % 45 === 0) lineWidth = HOUR_LINE_WIDTH.maj;

        var line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", circleCenterY);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", circleCenterY);
        line.setAttribute("stroke", CANVAS_BG_COLOR);
        line.setAttribute("stroke-width", lineWidth);
        line.setAttribute("transform", "rotate(" + angle + " " + circleCenterX + " " + circleCenterY + ")");

        // Add the hour lines to the dial group.
        dialGroup.appendChild(line);
    }

    return dialGroup;
}

function makeHourLabels (origX, origY, distance, color, offset, leftMargin) {
    // Default parameters.
    if (typeof(offset) === 'undefined') offset = 0;
    if (typeof(leftMargin) === 'undefined') leftMargin = 0;

    // rotation degrees = offset hours * 15 degrees / 1 hour
    var rotation = offset * 15;

    var HOUR_LABEL_MAP = [
        {angle: 0,   text: '6 AM'},
        {angle: 45,  text: '9 AM'},
        {angle: 90,  text: '12 Noon'},
        {angle: 135, text: '3 PM'},
        {angle: 180, text: '6 PM'},
        {angle: 225, text: '9 PM'},
        {angle: 270, text: '12 Midnight'},
        {angle: 315, text: '3 AM'}
    ];

    // Add some wiggle room so that labels near the center do not immediately
    // have their anchor points and baselines changed. 0 and 90 +/- 25 degrees
    // so that any labels < 2 hours away from the center will fall in the zone.
    var xMin = Math.floor(origX - distance * Math.cos(degreesToRadians(65)));
    var xMax = Math.floor(origX - distance * Math.cos(degreesToRadians(115)));
    var yMin = Math.floor(origY - distance * Math.sin(degreesToRadians(-25)));
    var yMax = Math.floor(origY - distance * Math.sin(degreesToRadians(25)));

    // Distance to the label that is less than the radius of the outer dial
    // indicates that we are working on the inner dial. Invert the label anchor
    // point location when working on the inner dial.
    var isInverted = false;
    if (distance < OUTER_DIAL_SPECS.radius) isInverted = true;

    var hourLabels = document.createElementNS(SVG_NS, "g");
    for (var i = 0; i < HOUR_LABEL_MAP.length; i++) {
        var angle = HOUR_LABEL_MAP[i].angle + rotation;

        var anchorX = Math.floor(origX - distance * Math.cos(degreesToRadians(angle)));
        var anchorY = Math.floor(origY - distance * Math.sin(degreesToRadians(angle)));

        // Use the location of the anchor point relative to the origin to
        // determine where in the text the anchor point should anchor.
        var anchorLoc = "middle";
        if (anchorX > xMax) {
            anchorLoc = "start";
            if (isInverted === true) anchorLoc = "end";
        }
        else if (anchorX < xMin) {
            anchorLoc = "end";
            if (isInverted === true) anchorLoc = "start";
        }

        // Adjust label's baseline based on anchor point's location relative to
        // its origin.
        if (anchorY > yMax && isInverted === false || anchorY > yMax && anchorY < yMin) {
            anchorY += HOUR_LABEL_FONT_SIZE * 0.5;
        }
        else if (anchorY < yMin && isInverted === true) {
            anchorY += HOUR_LABEL_FONT_SIZE;
        }

        var text = HOUR_LABEL_MAP[i].text;
        // Remove numbers from 12 o'clock hours to save space in inner dial.
        if (isInverted === true && text.substring(0, 3) === "12 ") {
            text = text.replace(/12 /, "");
        }

        // Create the SVG element and add it to the group.
        var label = document.createElementNS(SVG_NS, "text");
        label.setAttribute("x", anchorX + leftMargin);
        label.setAttribute("y", anchorY);
        label.setAttribute("text-anchor", anchorLoc);
        label.setAttribute("font-family", "Helvetica");
        label.setAttribute("font-size", HOUR_LABEL_FONT_SIZE);
        label.setAttribute("fill", color);
        label.innerHTML = text;
        hourLabels.appendChild(label);
    }

    return hourLabels;
}

function degreesToRadians (degrees) {
    return degrees * Math.PI / 180;
}

function rotateDial (dialGroup, offset) {
    // Use the origin of the first circle in the dial group to rotate about.
    var circ = dialGroup.getElementsByTagName("circle")[0];
    var x = circ.getAttribute("cx");
    var y = circ.getAttribute("cy");

    // degrees = offset hours * 15 degrees / 1 hour
    dialGroup.setAttribute("transform", "rotate(" + (offset * 15) + " " + x + " " + y + ")");
}

// TODO: Add current time after dropdown boxes. For example,
// United States (New York)    9:46 pm
// Spain (Madrid)              3:46 am
function addHtmlDialTitles (primTz, secTz, list, leftMargin) {
    // Default parameters.
    if (typeof(leftMargin) === 'undefined') leftMargin = 0;

    // TODO: I don't like having the class here coupled to the class in the
    // stylesheet.
    var dropdown = document.createElement("div");
    dropdown.setAttribute("class", "dropdown");

    var fontSize         = TITLE_FONT_SIZE;
    var subtitleFontSize = Math.floor(fontSize * 0.9);
    var lineHeight       = Math.floor(fontSize * 1.5);
    var leftIndent       = Math.floor(CANVAS_WIDTH / 5) + leftMargin;
    var topPadding       = fontSize;

    var subtitleDropdown = dropdown.cloneNode();
    subtitleDropdown.setAttribute("style", "top: " + (topPadding + lineHeight) + "px;"
        + "left: " + ( leftIndent + Math.floor(lineHeight / 2) ) + "px;");
    
    dropdown.setAttribute("style", "top: " + topPadding + "px;"
        + "left: " + leftIndent + "px;");

    // Add listeners to make the dropdowns function like dropdowns.
    subtitleDropdown.addEventListener("click", () => {
        showDropdown(subtitleDropdown);
        showInputHideButton(subtitleDropdown);
    });
    subtitleDropdown.addEventListener("mouseleave", () => {
        hideDropdown(subtitleDropdown);
        showButtonHideInput(subtitleDropdown);
    });

    dropdown.addEventListener("click", () => {
        showDropdown(dropdown);
        showInputHideButton(dropdown);
    });
    dropdown.addEventListener("mouseleave", () => {
        hideDropdown(dropdown);
        showButtonHideInput(dropdown);
    });
    
    var title    = primTz.flag + " " + primTz.title;
    var subtitle = secTz.flag + " " + secTz.title;

    var button = document.createElement("button");
    button.setAttribute("style", "color: " + primTz.color.light + ";" 
        + "font-size: " + fontSize + "px;");
    button.innerHTML = title;
    dropdown.appendChild(button);

    var titleInput = document.createElement("input");
    titleInput.setAttribute("type", "text");
    titleInput.setAttribute("style", `font-size: ${fontSize}px;`);
    dropdown.appendChild(titleInput);

    var subtitleButton = document.createElement("button");
    subtitleButton.setAttribute("style", "color: " + secTz.color.dark + ";"
        + "font-size: " + subtitleFontSize + "px;");
    subtitleButton.innerHTML = subtitle;
    subtitleDropdown.appendChild(subtitleButton);

    var subtitleInput = document.createElement("input");
    subtitleInput.setAttribute("type", "text");
    subtitleInput.setAttribute("style", `font-size: ${subtitleFontSize}px;`);
    subtitleDropdown.appendChild(subtitleInput);

    var ul = document.createElement("ul");
    ul.setAttribute("style", "font-size: " + fontSize + "px;");
    var subtitleUl = document.createElement("ul");
    subtitleUl.setAttribute("style", "font-size: " + subtitleFontSize + "px;");

    for (var tz in list) {
        var tzTitle = list[tz].flag + " " + list[tz].title;

        var newPrimTz = list[tz];
        var newSecTz  = secTz;
        var subPrimTz = primTz;
        var subSecTz  = list[tz];

        // Flip the timezone arguments if we are drawing the right side dropdown
        // menus.
        if (leftMargin > 0) {
            newPrimTz = secTz;
            newSecTz  = list[tz];
            subPrimTz = list[tz];
            subSecTz  = primTz;
        }

        ul.appendChild(createDropdownLi(tzTitle, newPrimTz, newSecTz));
        subtitleUl.appendChild(createDropdownLi(tzTitle, subPrimTz, subSecTz));
    }
    
    dropdown.appendChild(ul);
    subtitleDropdown.appendChild(subtitleUl);

    document.body.appendChild(dropdown);
    document.body.appendChild(subtitleDropdown);
}

function showDropdown (elem) {
    elem.getElementsByTagName("ul")[0].setAttribute("class", "active");
}

function hideDropdown (elem) {
    elem.getElementsByTagName("ul")[0].removeAttribute("class");
}

function showInputHideButton (elem) {
    elem.getElementsByTagName("button")[0].setAttribute("class", "hidden");
    
    const inputBox = elem.getElementsByTagName("input")[0];
    inputBox.setAttribute("class", "active");
    inputBox.focus();

    const tzList = elem.getElementsByTagName("ul")[0];
    inputBox.addEventListener('input', (e) => filterList(tzList, e.target.value));
}

function showButtonHideInput (elem) {
    elem.getElementsByTagName("button")[0].removeAttribute("class");

    const inputBox = elem.getElementsByTagName("input")[0];
    inputBox.removeAttribute("class");
}

function filterList (timezones, searchText) {
    const lowercaseSearchText = searchText.toLowerCase()
    for (let li of timezones.children) {
        li.removeAttribute("class");
        if ( !li.innerText.toLowerCase().includes(lowercaseSearchText) ) {
            li.setAttribute("class", "hidden");
        }
    }
}

// TODO: Make the dropdowns work on an iPhone.
// TODO: Make the dropdowns function like dropdowns; show current selection in 
// the middle of the list if that's where it is (do not start all selections 
// from the top), have it scroll.
function createDropdownLi (title, firstTz, secondTz) {
    var li = document.createElement("li");
    li.innerHTML = title;
    // Add listener to dismiss the dropdown when a list item is selected.
    li.addEventListener("click", () => drawChart(firstTz.key, secondTz.key) );
    return li;
}
