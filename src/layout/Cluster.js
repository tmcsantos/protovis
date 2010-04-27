/**
 * @class Cluster tree layout.
 * @extends pv.Layout.Hierarchy
 * @constructor
 */
pv.Layout.Cluster = function() {
  pv.Layout.Hierarchy.call(this);
  var interpolate, // cached interpolate
      buildImplied = this.buildImplied;

  /** @private Cache layout state to optimize properties. */
  this.buildImplied = function(s) {
    buildImplied.call(this, s);
    interpolate
        = /^(top|bottom)$/.test(s.orient) ? "step-before"
        : /^(left|right)$/.test(s.orient) ? "step-after"
        : "linear";
  };

  this.link.interpolate(function() { return interpolate; });
};

pv.Layout.Cluster.prototype = pv.extend(pv.Layout.Hierarchy)
    .property("group", Number)
    .property("orient", String)
    .property("innerRadius", Number)
    .property("outerRadius", Number);

/**
 * @type number
 * @name pv.Layout.Cluster.prototype.group
 */

/**
 * @type string
 * @name pv.Layout.Cluster.prototype.orient
 */

/**
 * @type number
 * @name pv.Layout.Cluster.prototype.innerRadius
 */

/**
 * @type number
 * @name pv.Layout.Cluster.prototype.outerRadius
 */

pv.Layout.Cluster.prototype.defaults = new pv.Layout.Cluster()
    .extend(pv.Layout.Hierarchy.prototype.defaults)
    .group(0)
    .orient("top");

/** @private */
pv.Layout.Cluster.prototype.buildImplied = function(s) {
  if (pv.Layout.Hierarchy.prototype.buildImplied.call(this, s)) return;

  var root = s.nodes[0],
      group = s.group,
      breadth,
      depth,
      leafCount = 0,
      leafIndex = .5 - group / 2;

  /* Count the leaf nodes and compute the depth of descendants. */
  var p = undefined;
  root.visitAfter(function(n) {
      if (n.firstChild) {
        n.depth = 1 + pv.max(n.childNodes, function(n) { return n.depth; });
      } else {
        if (group && (p != n.parentNode)) {
          p = n.parentNode;
          leafCount += group;
        }
        leafCount++;
        n.depth = 0;
      }
    });
  breadth = 1 / leafCount;
  depth = 1 / root.depth;

  /* Compute the unit breadth and depth of each node. */
  var p = undefined;
  root.visitAfter(function(n) {
      if (n.firstChild) {
        n.breadth = pv.mean(n.childNodes, function(n) { return n.breadth; });
      } else {
        if (group && (p != n.parentNode)) {
          p = n.parentNode;
          leafIndex += group;
        }
        n.breadth = breadth * leafIndex++;
      }
      n.depth = 1 - n.depth * depth;
    });

  /* Compute breadth and depth ranges for space-filling layouts. */
  root.visitAfter(function(n) {
      n.minBreadth = n.firstChild
          ? n.firstChild.minBreadth
          : (n.breadth - breadth / 2);
      n.maxBreadth = n.firstChild
          ? n.lastChild.maxBreadth
          : (n.breadth + breadth / 2);
    });
  root.visitBefore(function(n) {
      n.minDepth = n.parentNode
          ? n.parentNode.maxDepth
          : 0;
      n.maxDepth = n.parentNode
          ? (n.depth + root.depth)
          : (n.minDepth + 2 * root.depth);
    });
  root.minDepth = -depth;

  pv.Layout.Hierarchy.NodeLink.buildImplied.call(this, s);
};

/**
 * @class A variant of cluster layout that is space-filling.
 * @extends pv.Layout.Cluster
 * @constructor
 */
pv.Layout.Cluster.Fill = function() {
  pv.Layout.Cluster.call(this);
  pv.Layout.Hierarchy.Fill.constructor.call(this);
};

pv.Layout.Cluster.Fill.prototype = pv.extend(pv.Layout.Cluster);

/** @private */
pv.Layout.Cluster.Fill.prototype.buildImplied = function(s) {
  if (pv.Layout.Cluster.prototype.buildImplied.call(this, s)) return;
  pv.Layout.Hierarchy.Fill.buildImplied.call(this, s);
};
