const parser = new DOMParser();

const scaler = document.getElementById('scaler');

// Real time scaler
scaler.addEventListener('input', function() {
    let svg = document.getElementById('rocket');
    const scale = scaler.value;
    svg.setAttribute('width', scale * 2.1);
    svg.setAttribute('height', scale * 0.9);

    console.log("ASDASDASDA");
})

document.getElementById('zipFileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.ork')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            confirm("Make sure all fins are converted to freeform fins");

            const arrayBuffer = event.target.result;
            JSZip.loadAsync(arrayBuffer).then(function(zip) {
                zip.forEach(function (relativePath, zipEntry) {
                    if (zipEntry.name === 'rocket.ork') {
                        zipEntry.async('string').then(function(content) {
                            processRocketFile(content);
                        });
                    }
                });
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert('Please upload a valid .zip file.');
    }
});

function processRocketFile(file) {
    const simChart = document.getElementById('chart');
    const rocketDrawing = document.getElementById('rocket');
    
    const doc = parser.parseFromString(file, 'text/xml');
    const openrocket = doc.querySelector('openrocket');
    const rocket = openrocket.querySelector('rocket');

    const headers = "Time,Altitude,Vertical velocity,Vertical acceleration,Total velocity,Total acceleration,Position East of launch,Position North of launch,Lateral distance,Lateral direction,Lateral velocity,Lateral acceleration,Latitude,Longitude,Gravitational acceleration,Angle of attack,Roll rate,Pitch rate,Yaw rate,Mass,Motor mass,Longitudinal moment of inertia,Rotational moment of inertia,CP location,CG location,Stability margin calibers,Mach number,Reynolds number,Thrust,Drag force,Drag coefficient,Axial drag coefficient,Friction drag coefficient,Pressure drag coefficient,Base drag coefficient,Normal force coefficient,Pitch moment coefficient,Yaw moment coefficient,Side force coefficient,Roll moment coefficient,Roll forcing coefficient,Roll damping coefficient,Pitch damping coefficient,Coriolis acceleration,Reference length,Reference area,Vertical orientation (zenith),Lateral orientation (azimuth),Wind velocity,Air temperature,Air pressure,Speed of sound,Simulation time step,Computation time".split(",");

    // plotSim(
    //     openrocket.querySelector('simulations').children[0],
    //     simChart, headers
    // );
    
    drawRocket(
        rocket.querySelector('subcomponents'),
        rocketDrawing
    );
}

function drawRocket(rocket, svgContainer) {
    while (svgContainer.firstChild) {
        svgContainer.removeChild(svgContainer.firstChild);
    }

    var stages = rocket.querySelectorAll('stage');

    stages.forEach((stage) => {
        drawSubComponents(stage.querySelector('subcomponents'), svgContainer);
    });

    function drawSubComponents(component, svgContainer, y = 0) {
        var components = component.children;
        
        for (var i = 0; i < components.length; i++) {
            switch (components[i].nodeName) {
                case "nosecone":
                    y += drawNoseCone(components[i], svgContainer, y);
                    y = drawSubComponents(components[i].querySelector('subcomponents'), svgContainer, y);
                    break;

                case "bodytube":
                    y += drawBodyTube(components[i], svgContainer, y);
                    y = drawSubComponents(components[i].querySelector('subcomponents'), svgContainer, y);
                    break;

                case "ellipticalfinset":
                case "freeformfinset":
                // case "trapezoidfinset":
                    drawFins(components[i], svgContainer, y);
                    break;

                default: break;
            }
        }

        return y;
    }
    
    function drawNoseCone(component, svgContainer, y) {
        let length = component.querySelector('length').textContent * scaler.value;
        let radius = (component.querySelector('aftradius').textContent.split("auto ")[1]) * scaler.value;
        
        const originY = svgContainer.height.baseVal.value / 2;
        const res = 0.001;
    
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let d = `M${0},${originY}`;  // Start at the base center
    
        switch (component.querySelector('shape').textContent) {
            case "ogive":
                for (let x = length; x >= 0; x--) {
                    let y = radius * (Math.sqrt(1 - Math.pow((x / length), 2)));
                    d += ` L${length-x},${originY - y}`;
                }

                d += `L${length},${originY}`;
                d += `M${0},${originY}`;

                for (let x = length; x >= 0; x--) {
                    let y = radius * (Math.sqrt(1 - Math.pow((x / length), 2)));
                    d += ` L${length-x},${originY + y}`;
                }
                d += `L${length},${originY}`;

                break;
    
            case "conical":
                d += ` L${length},${originY - radius} L${length},${originY + radius} Z`;
                break;
    
            case "ellipsoid":
                for (let x = 0; x <= length; x += res) {
                    let y = radius * Math.sqrt(1 - Math.pow(x / length, 2));
                    d += ` L${x},${originY - y}`;
                }
                for (let x = length; x >= 0; x -= res) {
                    let y = radius * Math.sqrt(1 - Math.pow(x / length, 2));
                    d += ` L${x},${originY + y}`;
                }
                break;
    
            case "power":
                let n = component.querySelector("shapeparameter").textContent;
                for (let x = 0; x <= length; x += res) {
                    let y = radius * Math.pow((x / length), n);
                    d += ` L${x},${originY - y}`;
                }
                for (let x = length; x >= 0; x -= res) {
                    let y = radius * Math.pow((x / length), n);
                    d += ` L${x},${originY + y}`;
                }
                break;
    
            case "parabolic":
                let k = component.querySelector("shapeparameter").textContent;
                for (let x = 0; x <= length; x += res) {
                    let y = radius * ((2 * (x / length)) - k * Math.pow(x / length, 2)) / (2 - k);
                    d += ` L${x},${originY - y}`;
                }
                for (let x = length; x >= 0; x -= res) {
                    let y = radius * ((2 * (x / length)) - k * Math.pow(x / length, 2)) / (2 - k);
                    d += ` L${x},${originY + y}`;
                }
                break;
    
            case "haack":
                let C = component.querySelector("shapeparameter").textContent;
                for (let x = 0; x <= length; x += res) {
                    let theta = Math.acos(1 - ((2 * x) / length));
                    let y = (radius * Math.sqrt(theta - (Math.sin(2 * theta) / 2) + C * (1 / 4) * (3 * Math.sin(theta) - Math.sin(3 * theta)))) / Math.sqrt(Math.PI);
                    d += ` L${x},${originY - y}`;
                }
                for (let x = length; x >= 0; x -= res) {
                    let theta = Math.acos(1 - ((2 * x) / length));
                    let y = (radius * Math.sqrt(theta - (Math.sin(2 * theta) / 2) + C * (1 / 4) * (3 * Math.sin(theta) - Math.sin(3 * theta)))) / Math.sqrt(Math.PI);
                    d += ` L${x},${originY + y}`;
                }
                break;
    
            default:
                break;
        }
    
        path.setAttribute("d", d.trim());
        path.setAttribute("fill", "gray");
        path.setAttribute("stroke", "black");
    
        svgContainer.appendChild(path);
    
        return length;
    }
    

    function drawBodyTube(component, svgContainer, y) {
        let length = component.querySelector('length').textContent * scaler.value;
        let radius = component.querySelector('radius').textContent;

        if (radius.includes("auto")) {
            radius = radius.split("auto")[1];
        }
        radius *= scaler.value;
        
        const originY = svgContainer.height.baseVal.value / 2;

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

        rect.setAttribute("x", y);
        rect.setAttribute("y", originY - radius);
        rect.setAttribute("width", length);
        rect.setAttribute("height", radius * 2);
        rect.setAttribute("fill", "gray");
        rect.setAttribute("stroke", "black");

        svgContainer.appendChild(rect);

        return length;
    }

    function drawFins(component, svgContainer, length) {
        const originY = svgContainer.height.baseVal.value / 2;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let d = "";

        let radius = component.parentElement.parentElement.querySelector('radius').textContent;

        if (radius.includes("auto")) {
            radius = radius.split("auto")[1];
        }
        radius *= scaler.value;
        
        let xOffset = length + (component.querySelector('position').innerHTML * scaler.value);
        let yOffset = originY - radius;

        let rootchord;
        let tipchord;
        let sweeplength;
        let height;

        switch (component.localName) {
            case "ellipticalfinset":
                rootchord = component.querySelector('rootchord').innerHTML * scaler.value;
                height = component.querySelector('height').innerHTML * scaler.value;

                d += ` M${xOffset - (rootchord / 2)},${yOffset} A${rootchord / 2},${height} 0 0,1 ${xOffset - (rootchord / 2)},${originY}`;
                break;
                
            case "trapezoidfinset":
                rootchord = component.querySelector('rootchord').innerHTML * scaler.value;
                tipchord = component.querySelector('tipchord').innerHTML * scaler.value;
                sweeplength = component.querySelector('sweeplength').innerHTML * scaler.value;
                height = component.querySelector('height').innerHTML * scaler.value;

                d += ` M${xOffset},${yOffset} L${xOffset - rootchord},${yOffset} L${xOffset - rootchord + sweeplength},${yOffset + height} L${xOffset - rootchord + sweeplength + tipchord},${yOffset + height} Z`;
                break;

            case "freeformfinset":
                let points = component.querySelector('finpoints').children;
                xOffset -= points[points.length - 1].getAttribute('x') * scaler.value;

                for (var i = 0; i < points.length; i++) {
                    let x = (points[i].getAttribute('x') * scaler.value) + xOffset;
                    let y = yOffset - (points[i].getAttribute('y') * scaler.value);

                    if (i == 0) {
                        d += ` M${x},${y}`;
                    } else {
                        d += ` L${x},${y}`;
                    }
                }
                break;

            default: break;
        }

        path.setAttribute("d", d.trim());
        path.setAttribute("fill", "gray");
        path.setAttribute("stroke", "black");

        svgContainer.appendChild(path);
    }
}

function plotSim(sim, svgContainer, headers) {
    if (sim.attributes['status'].nodeValue == "uptodate") {
        var flightData = sim.querySelector('flightdata');
        
        const data = flightData.innerHTML.trim().split('\n').map(row => 
            row.replace(/<\/?datapoint>/g, '').split(',').map(value => parseFloat(value))
        );

        const xLabels = data.map(row => row[0]);
        const datasets = [];

        for (let i = 1; i < data[0].length; i++) {
            const dataset = {
                label: `${headers[i]}`,
                data: data.map(row => row[i]),
                borderColor: `hsl(${((i - 1) * 360) / (data[0].length - 1)}, 100%, 50%)`,
                borderWidth: 1
            };
            datasets.push(dataset);
        }

        // Your code to plot the graph using the dataset data
        // Since SVG doesn't directly support line graphs, you may need to create lines manually using SVG paths or use a library like D3.js

    } else {
        alert("Make sure you ran the simulation and saved with all simulation data");
    }
}
