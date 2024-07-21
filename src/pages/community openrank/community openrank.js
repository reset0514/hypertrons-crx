var container = document.getElementById('graph');
var chart = echarts.init(container);

var baseUrl = 'https://oss.x-lab.info/open_digger/github/';
var repoName = decodeURIComponent(getUrlParam('repo', 'X-lab2017/open-digger'));
var month = decodeURIComponent(getUrlParam('month', '2023-07'));
var typeMap = new Map([
  ['r', 'repo'], ['i', 'issue'], ['p', 'pull'], ['u', 'user']
]);

var loadData = m => {
  $.getJSON(
    `${baseUrl}${repoName}/project_openrank_detail/${m}.json`,
    onGraphDataLoaded);    
}

var clearDiv = id => {
  var div = document.getElementById(id);
  if (div && div.hasChildNodes()) {
    var children = div.childNodes;
    for (var child of children) {
      div.removeChild(child);
    }
  }
}

var addRow = (table, texts) => {
  var tr = table.insertRow();
  for (var t of texts) {
    var td = tr.insertCell();
    td.appendChild(document.createTextNode(t));
  }
}

var genName = node => (node.c == 'i' || node.c == 'p') ?
          `#${node.n.toString()}` : node.n.toString();

var setLeaderboard = graph => {
  clearDiv('leaderboard_table');
  var table = document.getElementById('leaderboard_table');
  addRow(table, ['Login', 'OpenRank']);
  var users = graph.nodes.filter(c => c.c === 'u').sort((a, b) => b.v - a.v);
  for (var u of users) {
    addRow(table, [u.n, u.v]);
  }
}

var setDetails = (graph, node) => {
  clearDiv('details_table');
  var table = document.getElementById('details_table');
  addRow(table, ['From', 'Ratio', 'Value', 'OpenRank']);
  addRow(table, [ 'Self', node.r, node.i, (node.r * node.i).toFixed(3) ]);
  var other = graph.links.filter(l => l.t == node.id).map(l => {
    var source = graph.nodes.find(n => n.id == l.s);
    return [
      genName(source),
      parseFloat((1 - node.r) * l.w).toFixed(3),
      source.v, 
      parseFloat(((1 - node.r) * l.w * source.v).toFixed(3))
    ];
  }).sort((a, b) => b[3] - a[3]);
  for (var r of other) {
    addRow(table, r);
  }
}

var onGraphDataLoaded = graph => {
  setLeaderboard(graph);
  var nodes = graph.nodes.map(node => {
    return {
      id: node.id,
      name: genName(node),
      symbolSize:  Math.log(node.v + 1) * 6,
      value: node.v,
      category: typeMap.get(node.c),
    };
  });
  var links = graph.links.map(link => {
    return {
      source: link.s,
      target: link.t,
      value: link.w,
    };
  });
  var categories = Array.from(typeMap.values());
  var option = {
    title: {
      text: `OpenRank details for ${repoName} in ${month}`,
      top: 'bottom',
      left: 'right'
    },
    legend: [
      {
        data: categories,
      }
    ],
    tooltip: {
      trigger: 'item',
    },
    series: [
      {
        name: 'Collaborative graph',
        type: 'graph',
        layout: 'force',
        nodes,
        links,
        categories: categories.map(c => { return { name: c }; }),
        roam: true,
        label: {
          position: 'right',
          show: true,
        },
        force: {
          layoutAnimation: false,
          repulsion: 300
        },
      }
    ]
  };
  chart.setOption(option);
  chart.on('dblclick', function(params) {
    setDetails(graph, graph.nodes.find(i => i.id === params.data.id));
  });
}

loadData(month);
