const parser = new DOMParser();

const scaler = document.getElementById('scaler');

document.getElementById('zipFileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.ork')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const arrayBuffer = event.target.result;
            JSZip.loadAsync(arrayBuffer).then(function(zip) {
                zip.forEach(function (relativePath, zipEntry) {
                    if (zipEntry.name === 'rocket.ork') {
                        zipEntry.async('string').then(function(content) {
                            processRocketFile(content)
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

function drawRocket(rocket, canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // get all stages then open it and look for all of the subcomponents
    // and draw the components 

    var stages = rocket.querySelectorAll('stage');

    stages.forEach((stage) => {
        drawSubComponents(stage.querySelector('subcomponents'), ctx);
    });

    function drawSubComponents(component, ctx) {
        console.log(component);

        var components = component.children;
        console.log(components);
        
        for (var i=0; i < components.length; i++) {
            switch (components[i].nodeName) {
                case "nosecone":
                    drawNoseCone(components[i], ctx);
                    break;

                case "bodytube":
                    drawBodyTube(components[i], ctx);
                    break;

                case "trapezoidfinset":
                    drawFins(components[i], ctx);
                    break;

                default: break;
            }
        }
    }

    function drawNoseCone(component, ctx) {
        console.log("drawing nosecone");

        let length = component.querySelector('length').textContent * scaler.value;
        let radius = (component.querySelector('aftradius').textContent.split("auto ")[1]) * scaler.value;
        
        const originY = canvas.height / 2;
        const res = .001;

        console.log(length, radius)

        switch (component.querySelector('shape').textContent) {
            case "ogive":
                console.log("drawing ogive nosecone");

                ctx.beginPath();

                // Top half of the ogive nosecone
                for (let x = length; x >= 0; x-=res) {
                    let y = radius * (Math.sqrt(1 - Math.pow(x / length, 2)));
                    ctx.lineTo(length - x, originY - y);
                }

                // Bottom half of the ogive nosecone
                for (let x = 0.0; x <= length; x+=res) {
                    let y = radius * (Math.sqrt(1 - Math.pow(x / length, 2)));
                    ctx.lineTo(length - x, originY + y);
                }

                ctx.closePath();
                ctx.fillStyle = 'gray';
                ctx.fill();
                ctx.stroke();

                break;

            case "conical":
                console.log("drawing concial nosecone");

                ctx.beginPath();
                ctx.moveTo(originX, originY);

                ctx.lineTo(-length, originY - radius);
                ctx.lineTo(-length, originY + radius);

                ctx.closePath();
                ctx.fillStyle = 'gray';
                ctx.fill();
                ctx.stroke();
                
                break;

            case "ellipsoid":
                console.log("drawing ellipsoid nosecone");
                ctx.beginPath();

                // Top half of the nosecone
                for (let x = length; x >= 0; x-=res) {
                    let y = radius * Math.sqrt(1-(x**2 / length**2));

                    ctx.lineTo(length - x, originY - y);
                }

                // Bottom half of the nosecone
                for (let x = 0.0; x <= length; x+=res) {
                    let y = radius * Math.sqrt(1-(x**2 / length**2));

                    ctx.lineTo(length - x, originY + y);
                }

                ctx.closePath();
                ctx.fillStyle = 'gray';
                ctx.fill();
                ctx.stroke();

                break;

            case "power":
                console.log("drawing power nosecone");

                ctx.beginPath();

                let n = component.querySelector("shapeparameter").textContent;

                console.log(n);
                console.log(component.querySelector("shapeparameter"));

                // Top half of the nosecone
                for (let x = 0.0; x <= length; x+=res) {
                    let y = radius * Math.pow(x/length, n);

                    ctx.lineTo(x, originY - y);
                }

                // Bottom half of the nosecone
                for (let x = length; x >= 0; x-=res) {

                    let y = radius * Math.pow(x/length, n);

                    ctx.lineTo(x, originY + y);
                }

                ctx.closePath();
                ctx.fillStyle = 'gray';
                ctx.fill();
                ctx.stroke();
                
                break;

            case "parabolic": // X
                console.log("drawing parabolic nosecone");

                ctx.beginPath();

                let k = component.querySelector("shapeparameter").textContent;

                // Top half of the nosecone
                for (let x = 0.0; x <= length; x+=res) {
                    let y = radius * ( 2 * (x/length) - k * (x/length)**2 ) / (2-k);

                    ctx.lineTo(x, originY - y);
                }

                // Bottom half of the nosecone
                for (let x = length; x >= 0; x-=res) {
                    let y = radius * ( 2 * (x/length) - k * (x/length)**2 ) / (2-k);

                    ctx.lineTo(x, originY + y);
                }
                
                ctx.closePath();
                ctx.fillStyle = 'gray';
                ctx.fill();
                ctx.stroke();

                break;

            case "haack":
                console.log("drawing haack nosecone");

                ctx.beginPath();

                let C = component.querySelector("shapeparameter").textContent;
                console.log(C)

                // Top half of the nosecone
                for (let x = 0.0; x <= length; x+=res) {
                    let theta = Math.acos(1-((2*x)/length));
                    let y = ( radius * Math.sqrt(theta - (Math.sin(2 * theta) / 2) + C * 1/4 * (3*Math.sin(theta) - Math.sin(3*theta))) ) / (Math.sqrt(Math.PI));

                    ctx.lineTo(x, originY - y);
                }

                // Bottom half of the nosecone
                for (let x = length; x >= 0; x-=res) {
                    let theta = Math.acos(1-((2*x)/length));
                    let y = ( radius * Math.sqrt(theta - (Math.sin(2 * theta) / 2) + C * 1/4 * (3*Math.sin(theta) - Math.sin(3*theta))) ) / (Math.sqrt(Math.PI));

                    ctx.lineTo(x, originY + y);
                }
                
                ctx.closePath();
                ctx.fillStyle = 'gray';
                ctx.fill();
                ctx.stroke();

                break;

            default: break;
        }
    }

    function drawBodyTube(component, ctx) {
        console.log("drawing bodytube");
    }

    function drawFins(component, ctx) {
        console.log("drawing fins");
    }
}

function plotSim(sim, canvas, headers) {
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

        let chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: xLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time Sec'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Altitude (km)'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false // This hides all text in the legend and also the labels.
                    }
                }
            }
        });

        for (var i=1; i < data[0].length; i++) {
            chart.setDatasetVisibility(i, false);
        }
        chart.update();
    } else {
        alert("Make sure you ran the simulation and saved with all simulation data");
    }
}