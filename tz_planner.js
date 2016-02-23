// Time Zone Planner.

// TODO: Make this independent of the styles in tz_conv.css on which it
// currently relies heavily.
const SVG_NS = "http://www.w3.org/2000/svg";

// TODO: This chart is too large. Make it about 2/3 the size.
const CANVAS_HEIGHT   = 1100;
const CANVAS_WIDTH    = 1600;
const CANVAS_BG_COLOR = "#fff";

const CANVAS_MARGIN = 75;

const OUTER_DIAL_SPECS = {
    radius:     300,
    band_width: 40,
    padding:    15
};

const INNER_DIAL_SPECS = {
    radius:     250,
    band_width: 45,
    padding:    -60 // -1 * (band_width + 15) to position text inside dial 
};

const CIRCLE_ORIG_Y_POS = CANVAS_HEIGHT - OUTER_DIAL_SPECS.radius - CANVAS_MARGIN;

const CIRCLE_MASK_TOP_ID    = 'view-circle-top';
const CIRCLE_MASK_BOTTOM_ID = 'view-circle-bottom';

const TITLE_FONT_SIZE      = 40;
const HOUR_LABEL_FONT_SIZE = 24;

const COLORS = { 
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
// TODO: Build this object dynamically from file.
// TODO: Add more countries to this list.
const TIMEZONES = {
    afg: {
        flag:   "&#x1F1E6;&#x1F1EB;",
        title:  "Afghanistan",
        offset: 4.5
    },
    esp: {
        flag:   "&#x1F1EA;&#x1F1F8;",
        title:  "Spain",
        offset: 1
    },
    us_est: {
        flag:   "&#x1F1FA;&#x1F1F8;",
        title:  "United States (EST)",
        offset: -5
    },
    us_cst: {
        flag:   "&#x1F1FA;&#x1F1F8;",
        title:  "United States (CST)",
        offset: -6
    },
    us_mst: {
        flag:   "&#x1F1FA;&#x1F1F8;",
        title:  "United States (MST)",
        offset: -7
    },
    us_pst: {
        flag:   "&#x1F1FA;&#x1F1F8;",
        title:  "United States (PST)",
        offset: -8
    },

};

function drawChart (primTz, secTz) {
    // Default parameters.
    if (typeof(primTz) === 'undefined') primTz = TIMEZONES.us_est;
    if (typeof(secTz)  === 'undefined') secTz  = TIMEZONES.afg;

    // Set the default colors here.
    // TODO: Future improvement, allow picking from a variety of colors.
    primTz.color = COLORS.blue;
    secTz.color  = COLORS.green;

    var tzDiff = primTz.offset - secTz.offset;

    // Reset the body element so we can draw the chart on a clean slate.
    // I figure this is easier than rotating the two inner dials, changing the
    // titles, spinning the hour labels, etc.
    document.body.remove();
    document.body = document.createElement("body");

    // Draw the svg elements.
    drawSvg(primTz, secTz, tzDiff);

    // Add the html elements after drawing the svg elements.
    addHtmlDialTitles(primTz, secTz, TIMEZONES); // Left.
    addHtmlDialTitles(secTz, primTz, TIMEZONES, CANVAS_WIDTH / 2); // Right.
    addHtmlChartTitles(primTz, secTz); // Main title.
    
    // Draw the flip-flop button.
    var swapper = document.createElement("div");
    swapper.setAttribute("class", "swapper");
    // - TITLE_FONT_SIZE in order to center the swapper button.
    swapper.setAttribute("style", "top: " + (TITLE_FONT_SIZE * 6) + "px;"
        + "left: " + (Math.floor(CANVAS_WIDTH / 2) - TITLE_FONT_SIZE) + "px;");
    var swapButton = document.createElement("button");
    swapButton.setAttribute("style", "font-size: " + TITLE_FONT_SIZE + "px;");
    swapButton.innerHTML = "&#x21c4;";
    swapper.addEventListener("click", function() { drawChart(secTz, primTz); });
    swapper.appendChild(swapButton);
    document.body.appendChild(swapper);

    // TODO: Add red "second hand" that displays the current time on the dials.
    // TODO: Highlight the first dropdown menu when the page first loads, then fade out.
}

// TODO: Remove the extra space at the top where the titles (now drawn in html)
// used to go. Add top margin to the svg element to make up for it.
function drawSvg (primTz, secTz, difference) {
    // Make the base SVG element.
    var canvas = document.createElementNS(SVG_NS, "svg");
    canvas.setAttribute("height", CANVAS_HEIGHT);
    canvas.setAttribute("width", CANVAS_WIDTH);

    // Define clipping paths for day/night distinction in dials.
    var defs = document.createElementNS(SVG_NS, "defs");
    var clipPathTop = makeClipPath(CIRCLE_MASK_TOP_ID, CANVAS_HEIGHT - CIRCLE_ORIG_Y_POS);
    var clipPathBottom = makeClipPath(CIRCLE_MASK_BOTTOM_ID, CIRCLE_ORIG_Y_POS);
    defs.appendChild(clipPathTop);
    defs.appendChild(clipPathBottom);
    canvas.appendChild(defs);

    // Draw the left outer dial.
    var leftOuterDial   = makeDial(primTz.color.light, primTz.color.dark, OUTER_DIAL_SPECS);
    var leftOuterLabels = makeHourLabels(CANVAS_WIDTH / 4, CIRCLE_ORIG_Y_POS,
        OUTER_DIAL_SPECS.radius + OUTER_DIAL_SPECS.padding, primTz.color.dark);
    canvas.appendChild(leftOuterDial);
    canvas.appendChild(leftOuterLabels);
    
    // Draw the left inner dial.
    var leftInnerDial = makeDial(secTz.color.light, secTz.color.dark, INNER_DIAL_SPECS);
    rotateDial(leftInnerDial, difference);
    var leftInnerLabels = makeHourLabels(CANVAS_WIDTH / 4, CIRCLE_ORIG_Y_POS,
        INNER_DIAL_SPECS.radius + INNER_DIAL_SPECS.padding, secTz.color.dark, difference);
    // TODO: Can I move the rotation piece out of the label maker?
    canvas.appendChild(leftInnerDial);
    canvas.appendChild(leftInnerLabels);

    // Draw the right outer dial.
    var rightOuterDial   = makeDial(secTz.color.light, secTz.color.dark,
        OUTER_DIAL_SPECS, CANVAS_WIDTH / 2);
    var rightOuterLabels = makeHourLabels(CANVAS_WIDTH / 4, CIRCLE_ORIG_Y_POS,
        OUTER_DIAL_SPECS.radius + OUTER_DIAL_SPECS.padding, secTz.color.dark,
        0, CANVAS_WIDTH / 2);
    canvas.appendChild(rightOuterDial);
    canvas.appendChild(rightOuterLabels);
    
    // Draw the right inner dial.
    var rightInnerDial = makeDial(primTz.color.light, primTz.color.dark,
        INNER_DIAL_SPECS, CANVAS_WIDTH / 2);
    rotateDial(rightInnerDial, -1 * difference);
    var rightInnerLabels = makeHourLabels(CANVAS_WIDTH / 4, CIRCLE_ORIG_Y_POS,
        INNER_DIAL_SPECS.radius + INNER_DIAL_SPECS.padding, primTz.color.dark,
        -1 * difference, CANVAS_WIDTH / 2);
    // TODO: Can I move the rotation piece out of the label maker?
    canvas.appendChild(rightInnerDial);
    canvas.appendChild(rightInnerLabels);

    // Add the SVG element to the document.
    document.body.appendChild(canvas);
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

    var circleCenterX = CANVAS_WIDTH / 4 + leftMargin;
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
        var lineWidth = 2;
        // Increase the line weight every 3rd hour.
        if (angle % 45 === 0) lineWidth = 6;

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

function addHtmlDialTitles (primTz, secTz, list, leftMargin) {
    // Default parameters.
    if (typeof(leftMargin) === 'undefined') leftMargin = 0;

    // TODO: I don't like having the class here coupled to the class in the
    // stylesheet.
    var dropdown = document.createElement("div");
    dropdown.setAttribute("class", "dropdown");

    var fontSize = TITLE_FONT_SIZE;
    var subtitleFontSize = Math.floor(fontSize * 0.9);
    var lineHeight = Math.floor(fontSize * 1.5);
    var leftIndent = Math.floor(CANVAS_WIDTH / 10) + leftMargin;
    var topPadding = Math.floor(fontSize * 5);

    var subtitleDropdown = dropdown.cloneNode();
    subtitleDropdown.setAttribute("style", "top: " + (topPadding + lineHeight) + "px;"
        + "left: " + ( leftIndent + Math.floor(lineHeight / 2) ) + "px;");
    
    dropdown.setAttribute("style", "top: " + topPadding + "px;"
        + "left: " + leftIndent + "px;");

    // Add listeners to make the dropdowns function like dropdowns.
    subtitleDropdown.addEventListener("click", function() { showDropdown(subtitleDropdown); });
    subtitleDropdown.addEventListener("mouseleave", function() { hideDropdown(subtitleDropdown); });
    dropdown.addEventListener("click", function() { showDropdown(dropdown); });
    dropdown.addEventListener("mouseleave", function() { hideDropdown(dropdown); });
    
    var title    = primTz.flag + " " + primTz.title;
    var subtitle = secTz.flag + " " + secTz.title;

    var button = document.createElement("button");
    button.setAttribute("style", "color: " + primTz.color.light + ";" 
        + "font-size: " + fontSize + "px;");
    button.innerHTML = title;
    dropdown.appendChild(button);

    var subtitleButton = document.createElement("button");
    subtitleButton.setAttribute("style", "color: " + secTz.color.dark + ";"
        + "font-size: " + subtitleFontSize + "px;");
    subtitleButton.innerHTML = subtitle;
    subtitleDropdown.appendChild(subtitleButton);

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

// TODO: Make the dropdowns work on an iPhone.
function createDropdownLi (title, firstTz, secondTz) {
    var li = document.createElement("li");
    li.innerHTML = title;
    // Add listener to dismiss the dropdown when a list item is selected.
    li.addEventListener("click", function() { drawChart(firstTz, secondTz); });
    return li;
}

function addHtmlChartTitles (primTz, secTz) {
    var fontSize   = TITLE_FONT_SIZE;
    var lineHeight = Math.floor(fontSize * 1.25);

    var subtitle = document.createElement("h1");
    subtitle.setAttribute("style", "font-size: " + fontSize + "px;"
        + "width: " + CANVAS_WIDTH + "px;");

    var title = subtitle.cloneNode();
    title.innerHTML = primTz.title + " / " + secTz.title;
    title.setAttribute("style", title.getAttribute("style")
        + "top: " + CANVAS_MARGIN + "px;");

    subtitle.innerHTML = "Local Time Conversion Chart";
    subtitle.setAttribute("style", subtitle.getAttribute("style")
        + "top: " + (CANVAS_MARGIN + lineHeight) + "px;");

    document.body.appendChild(title);
    document.body.appendChild(subtitle);
}
