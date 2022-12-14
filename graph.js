// project from Udemy D3 course.  enhanced to keep expense name tied to the original color.
// Good examples of enter and exit selection logic to manage the legend.
// parsing the enter/exit selection is a bit involved, but it works
// note:  tried to keep the enter/update/exit functions in a .join() block, but calling other
// functions or transitions caused an error.

const dims = { height: 300, width: 300, radius: 150 };
const cent = { x: (dims.width/2 + 5), y: (dims.height/2 +5) };

const svg = d3.select('.canvas')
    .append('svg')
    .attr('width', dims.width + 150)
    .attr('height', dims.height + 150);

const graph = svg.append('g')
    .attr('transform', `translate(${cent.x}, ${cent.y})`);

const pie = d3.pie()
    .sort(null) // null keeps it from auto sorting
    .value(d => d.cost);

const arcPath = d3.arc()
    .outerRadius(dims.radius)
    .innerRadius(dims.radius / 2);

const color = d3.scaleOrdinal(d3['schemeSet3']);

// legend setup
const legendGroup = svg.append('g')
    .attr('transform', `translate(${dims.width + 40}, 10)`)

const legend = d3.legendColor()
    .shape('circle')
    .shapePadding(10)
    .scale(color);

let exclude = []; // set this array to filter the legend.  As names exit, we add to this array. As names enter, we remove them from this array.

// update function
const update = (data) => {

    console.log(pie(data));

    //join enhanced (pie) data to path elements
    const paths = graph.selectAll('path')
        .data(pie(data), d => d.data.name) // key function keeps the elements present.
        // this is where the .join() was causing problems.  paths.enter()/exit() is better.
        paths.enter()
            .append('path')
            .attr('d', arcPath)
            .attr('class', 'arc')
            .attr('stroke', '#fff')
            .attr('stroke-width', '3px')
            .attr('fill', d => color(d.data.name))
            .call(d => {
                const enterVals = d._groups[0]  
                                    .filter(value => Object.keys(value).length !== 0)
                                    .map(e=>e.__data__.data.name)
                console.log(enterVals) // debugging
                enterVals.forEach(v => { // this block from stack overflow on removing an item from an array
                    const index = exclude.indexOf(v);
                    if (index > -1) { // only splice array when item is found
                        exclude.splice(index, 1); // 2nd parameter means remove one item only
                    }
                })
            })
            .each(function(d){ this._current = d })
            .transition().duration(750)
                .attrTween("d", arcTweenEnter);

        paths.attr('d', arcPath)   // update calls.. stright from Udemy exercise
            .transition().duration(750)
                .attrTween('d', arcTweenUpdate);

        paths.exit()
            .remove()
            .call(d => {
                console.log(d._groups[0]
                                .filter(value => Object.keys(value).length !== 0)
                                .map(e=>e.__data__.data.name)) // debugging the exit selection
                d._groups[0]
                    .filter(value => Object.keys(value).length !== 0)
                    .map(e=>e.__data__.data.name)
                    .forEach(i => {exclude.push(i)}) 
                legend.cellFilter((d) => {
                    return !exclude.includes(d.label)
                })
            })
            .call(() => {legendGroup.call(legend)})
            .transition().duration(750)
                .attrTween('d', arcTweenExit);       

    legendGroup.call(legend);
    legendGroup.selectAll('text').attr('fill', 'white');

    console.log(exclude); // debugging
}

// data array and firestore
var data = [];

// one block to manage all firestore interfaces
db.collection('expenses').onSnapshot(res => {
    res.docChanges().forEach(change => {
        const doc = {...change.doc.data(), id: change.doc.id };
        switch (change.type) {
            case 'added':
                data.push(doc);
                break;
            case 'modified':
                const index = data.findIndex(item => item.id == doc.id)
                data[index] = doc;
                break;
            case 'removed':
                data = data.filter(item => item.id != doc.id);
                break;
            default:
                break;
        }
    });

    update(data);
});

const arcTweenEnter = (d) => {
    var i = d3.interpolate(d.endAngle, d.startAngle)
    return function(t){
        d.startAngle = i(t);
        return arcPath(d);
    }
}

const arcTweenExit = (d) => {
    var i = d3.interpolate(d.startAngle, d.endAngle)
    return function(t){
        d.startAngle = i(t);
        return arcPath(d);
    }
}

// use function keyword instead of arrow function to allow use of 'this'
function arcTweenUpdate(d) {
    //interpolate between the two objects.  This interpolates between every element of the objects
    var i = d3.interpolate(this._current , d)
    // update the current prop with the new data
    this._current = i(1); // i(1) is the same as 'd'

    return function(t) {
        return arcPath(i(t));
    }
}
