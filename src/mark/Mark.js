/**
 * Constructs a new mark with default properties. Marks, with the exception of
 * the root panel, are not typically constructed directly; instead, they are
 * added to a panel or an existing mark via {@link pv.Mark#add}.
 *
 * @class Represents a data-driven graphical mark. The <tt>Mark</tt> class is
 * the base class for all graphical marks in Protovis; it does not provide any
 * specific rendering functionality, but together with {@link Panel} establishes
 * the core framework.
 *
 * <p>Concrete mark types include familiar visual elements such as bars, lines
 * and labels. Although a bar mark may be used to construct a bar chart, marks
 * know nothing about charts; it is only through their specification and
 * composition that charts are produced. These building blocks permit many
 * combinatorial possibilities.
 *
 * <p>Marks are associated with <b>data</b>: a mark is generated once per
 * associated datum, mapping the datum to visual <b>properties</b> such as
 * position and color. Thus, a single mark specification represents a set of
 * visual elements that share the same data and visual encoding. The type of
 * mark defines the names of properties and their meaning. A property may be
 * static, ignoring the associated datum and returning a constant; or, it may be
 * dynamic, derived from the associated datum or index. Such dynamic encodings
 * can be specified succinctly using anonymous functions. Special properties
 * called event handlers can be registered to add interactivity.
 *
 * <p>Protovis uses <b>inheritance</b> to simplify the specification of related
 * marks: a new mark can be derived from an existing mark, inheriting its
 * properties. The new mark can then override properties to specify new
 * behavior, potentially in terms of the old behavior. In this way, the old mark
 * serves as the <b>prototype</b> for the new mark. Most mark types share the
 * same basic properties for consistency and to facilitate inheritance.
 *
 * <p>The prioritization of redundant properties is as follows:<ol>
 *
 * <li>If the <tt>width</tt> property is not specified (i.e., null), its value
 * is the width of the parent panel, minus this mark's left and right margins;
 * the left and right margins are zero if not specified.
 *
 * <li>Otherwise, if the <tt>right</tt> margin is not specified, its value is
 * the width of the parent panel, minus this mark's width and left margin; the
 * left margin is zero if not specified.
 *
 * <li>Otherwise, if the <tt>left</tt> property is not specified, its value is
 * the width of the parent panel, minus this mark's width and the right margin.
 *
 * </ol>This prioritization is then duplicated for the <tt>height</tt>,
 * <tt>bottom</tt> and <tt>top</tt> properties, respectively.
 *
 * <p>While most properties are <i>variable</i>, some mark types, such as lines
 * and areas, generate a single visual element rather than a distinct visual
 * element per datum. With these marks, some properties may be <b>fixed</b>.
 * Fixed properties can vary per mark, but not <i>per datum</i>! These
 * properties are evaluated solely for the first (0-index) datum, and typically
 * are specified as a constant. However, it is valid to use a function if the
 * property varies between panels or is dynamically generated.
 *
 * <p>See also the <a href="../../api/">Protovis guide</a>.
 */
pv.Mark = function() {
  /*
   * TYPE 0 constant defs
   * TYPE 1 function defs
   * TYPE 2 constant properties
   * TYPE 3 function properties
   * in order of evaluation!
   */
  this.$properties = [];
  this.$propertiesMap = {};
  this.$handlers = {};
};

/** @private Records which properties are defined on this mark type. */
pv.Mark.prototype.properties = {};

/** @private Records the cast function for each property. */
pv.Mark.cast = {};

/**
 * @private Defines and registers a property method for the property with the
 * given name.  This method should be called on a mark class prototype to define
 * each exposed property. (Note this refers to the JavaScript
 * <tt>prototype</tt>, not the Protovis mark prototype, which is the {@link
 * #proto} field.)
 *
 * <p>The created property method supports several modes of invocation: <ol>
 *
 * <li>If invoked with a <tt>Function</tt> argument, this function is evaluated
 * for each associated datum. The return value of the function is used as the
 * computed property value. The context of the function (<tt>this</tt>) is this
 * mark. The arguments to the function are the associated data of this mark and
 * any enclosing panels. For example, a linear encoding of numerical data to
 * height is specified as
 *
 * <pre>m.height(function(d) d * 100);</pre>
 *
 * The expression <tt>d * 100</tt> will be evaluated for the height property of
 * each mark instance. The return value of the property method (e.g.,
 * <tt>m.height</tt>) is this mark (<tt>m</tt>)).<p>
 *
 * <li>If invoked with a non-function argument, the property is treated as a
 * constant. The return value of the property method (e.g., <tt>m.height</tt>)
 * is this mark.<p>
 *
 * <li>If invoked with no arguments, the computed property value for the current
 * mark instance in the scene graph is returned. This facilitates <i>property
 * chaining</i>, where one mark's properties are defined in terms of another's.
 * For example, to offset a mark's location from its prototype, you might say
 *
 * <pre>m.top(function() this.proto.top() + 10);</pre>
 *
 * Note that the index of the mark being evaluated (in the above example,
 * <tt>this.proto</tt>) is inherited from the <tt>Mark</tt> class and set by
 * this mark. So, if the fifth element's top property is being evaluated, the
 * fifth instance of <tt>this.proto</tt> will similarly be queried for the value
 * of its top property. If the mark being evaluated has a different number of
 * instances, or its data is unrelated, the behavior of this method is
 * undefined. In these cases it may be better to index the <tt>scene</tt>
 * explicitly to specify the exact instance.
 *
 * </ol><p>Property names should follow standard JavaScript method naming
 * conventions, using lowerCamel-style capitalization.
 *
 * <p>In addition to creating the property method, every property is registered
 * in the {@link #properties} map on the <tt>prototype</tt>. Although this is an
 * instance field, it is considered immutable and shared by all instances of a
 * given mark type. The <tt>properties</tt> map can be queried to see if a mark
 * type defines a particular property, such as width or height.
 *
 * @param {string} name the property name.
 * @param {function} [cast] the cast function for this property.
 */
pv.Mark.prototype.property = function(name, cast) {
  if (!this.hasOwnProperty("properties")) {
    this.properties = pv.extend(this.properties);
  }
  this.properties[name] = true;

  /*
   * Define the setter-getter globally, since the default behavior should be the
   * same for all properties, and since the Protovis inheritance chain is
   * independent of the JavaScript inheritance chain. For example, anchors
   * define a "name" property that is evaluated on derived marks, even though
   * those marks don't normally have a name.
   */
  pv.Mark.prototype.propertyMethod(name, false, pv.Mark.cast[name] = cast);
  return this;
};

// Adapted from pv.Layout#property
/**
 * Defines a local property with the specified name and cast.
 * Note that although the property method is only defined locally,
 * the cast function is global,
 * which is necessary since properties are inherited!
 *
 * @param {string} name the property name.
 * @param {function} [cast] the cast function for this property.
 */
pv.Mark.prototype.localProperty = function(name, cast) {
  if (!this.hasOwnProperty("properties")) {
    this.properties = pv.extend(this.properties);
  }
  this.properties[name] = true;
  
  var currCast = pv.Mark.cast[name];
  if(cast){
      pv.Mark.cast[name] = currCast = cast;
  }
  
  this.propertyMethod(name, false, currCast);
  return this;
};

/**
 * @private Defines a setter-getter for the specified property.
 *
 * <p>If a cast function has been assigned to the specified property name, the
 * property function is wrapped by the cast function, or, if a constant is
 * specified, the constant is immediately cast. Note, however, that if the
 * property value is null, the cast function is not invoked.
 *
 * @param {string} name the property name.
 * @param {boolean} [def] whether is a property or a def.
 * @param {function} [cast] the cast function for this property.
 */
pv.Mark.prototype.propertyMethod = function(name, def, cast) {
  if (!cast) cast = pv.Mark.cast[name];
  
  this[name] = function(v, tag) {
      /* When arguments are specified, set the property/def value. */
      
      /* DEF */
      if (def && this.scene) {
        var defs = this.scene.defs;
        
        if (arguments.length) {
          defs[name] = {
            id:    (v == null) ? 0 : pv.id(),
            value: ((v != null) && cast) ? cast(v) : v
          };
          
          return this;
        }
        
        return defs[name] ? defs[name].value : null;
      }
      
      /* PROP */
      if (arguments.length) {
        this.setPropertyValue(name, v, def, cast, /* chain */false, tag);
        return this;
      }
      
      // Listening to function property dependencies?
      var propEval = pv.propertyEval;
      if(propEval) {
          var binds = this.binds;
          var propRead = binds.properties[name];
          if(propRead){
              var net = binds.net;
              var readNetIndex = net[name];
              if(readNetIndex == null){
                  readNetIndex = net[name] = 0;
              }
              
              (propRead.dependents || (propRead.dependents = {}))
                  [propEval.name] = true;
              
              (pv.propertyEvalDependencies || (pv.propertyEvalDependencies = {}))
                  [name] = true;
              
              // evalNetIndex must be at least one higher than readNetIndex
              if(readNetIndex >= pv.propertyEvalNetIndex){
                  pv.propertyEvalNetIndex = readNetIndex + 1;
              }
          }
      }
      
      return this.instance()[name];
    };
};

/** @private Creates and returns a wrapper function to call a property function and a property cast. */
pv.Mark.funPropertyCaller = function(fun, cast){
    // Avoiding the use of arguments object to try to speed things up
    var stack = pv.Mark.stack;
    
    return function(){
        var value = fun.apply(this, stack);
        return value != null ? cast(value) : value; // some things depend on the null/undefined distinction
    };
};

/** @private Sets the value of the property <i>name</i> to <i>v</i>. */
pv.Mark.prototype.setPropertyValue = function(name, v, def, cast, chain, tag){
    /* bit 0: 0 = value, 1 = function
     * bit 1: 0 = def,   1 = prop
     * ------------------------------
     * 00 - 0 - def  - value
     * 01 - 1 - def  - function
     * 10 - 2 - prop - value
     * 11 - 3 - prop - function
     * 
     * x << 1 <=> floor(x) * 2
     * 
     * true  << 1 -> 2 - 10
     * false << 1 -> 0 - 00
     */
    var type = !def << 1 | (typeof v === "function");
    // A function and cast?
    if(type & 1 && cast){
        v = pv.Mark.funPropertyCaller(v, cast);
    } else if(v != null && cast){
        v = cast(v);
    }
    
    // ------
    
    var propertiesMap = this.$propertiesMap;
    var properties = this.$properties;
    
    var p = {
        name:  name,
        id:    pv.id(), 
        value: v,
        type:  type,
        tag:   tag
    };
  
    var specified = propertiesMap[name];
  
    propertiesMap[name] = p;
  
    if(specified){
        // Find it and remove it
        for (var i = 0; i < properties.length; i++) {
            if (properties[i] === specified) {
                properties.splice(i, 1);
                break;
            }
        }
    }
    
    properties.push(p);
    
    if(chain && specified && type === 3){ // is a prop fun
        p.proto = specified;
        p.root  = specified.root || specified;
    }
    
    return p;
};

pv.Mark.prototype.intercept = function(name, v, keyArgs){
    this.setPropertyValue(
            name, 
            v, 
            /* def */ false,
            pv.get(keyArgs, 'noCast') ? null : pv.Mark.cast[name],
            /* chain*/ true,
            pv.get(keyArgs, 'tag'));
    
    return this;
};

/**
 * Gets the static value of a property, without evaluation.
 * @param {string} name the property name.
 * @type any
 */
pv.Mark.prototype.propertyValue = function(name, inherit) {
    var p = this.$propertiesMap[name];
    if(p){
        return p.value;
    }
    
    // This mimics the way #bind works
    if(inherit){
        if(this.proto){
            var value = this.proto.propertyValueRecursive(name);
            if(value !== undefined){
                return value;
            }
        }
        
        return this.defaults.propertyValueRecursive(name);
    }
    
    //return undefined;
};

/** @private */
pv.Mark.prototype.propertyValueRecursive = function(name) {
    var p = this.$propertiesMap[name];
    if(p         ) { return p.value; }
    if(this.proto) { return this.proto.propertyValueRecursive(name); }
    //return undefined;
};

/** @private Stores the current data stack. */
//must be declared before defaults, below
pv.Mark.stack = [];

/* Define all global properties. */
pv.Mark.prototype
    .property("data")
    .property("visible", Boolean)
    // CSS attributes pass-through
    .property("css", Object)
    // SVG attributes pass-through
    .property("svg", Object)
    .property("left", Number)
    .property("right", Number)
    .property("top", Number)
    .property("bottom", Number)
    .property("cursor", String)
    .property("title", String)
    .property("reverse", Boolean)
    .property("antialias", Boolean)
    .property("events", String)
    .property("id", String);

/**
 * The mark type; a lower camelCase name. The type name controls rendering
 * behavior, and unless the rendering engine is extended, must be one of the
 * built-in concrete mark types: area, bar, dot, image, label, line, panel,
 * rule, or wedge.
 *
 * @type string
 * @name pv.Mark.prototype.type
 */

/**
 * The mark prototype, possibly undefined, from which to inherit property
 * functions. The mark prototype is not necessarily of the same type as this
 * mark. Any properties defined on this mark will override properties inherited
 * either from the prototype or from the type-specific defaults.
 *
 * @type pv.Mark
 * @name pv.Mark.prototype.proto
 */

/**
 * The mark anchor target, possibly undefined.
 *
 * @type pv.Mark
 * @name pv.Mark.prototype.target
 */

/**
 * The enclosing parent panel. The parent panel is generally undefined only for
 * the root panel; however, it is possible to create "offscreen" marks that are
 * used only for inheritance purposes.
 *
 * @type pv.Panel
 * @name pv.Mark.prototype.parent
 */

/**
 * The child index. -1 if the enclosing parent panel is null; otherwise, the
 * zero-based index of this mark into the parent panel's <tt>children</tt> array.
 *
 * @type number
 */
pv.Mark.prototype.childIndex = -1;

/**
 * The mark index. The value of this field depends on which instance (i.e.,
 * which element of the data array) is currently being evaluated. During the
 * build phase, the index is incremented over each datum; when handling events,
 * the index is set to the instance that triggered the event.
 *
 * @type number
 */
pv.Mark.prototype.index = -1;

/**
 * The current scale factor, based on any enclosing transforms. The current
 * scale can be used to create scale-independent graphics. For example, to
 * define a dot that has a radius of 10 irrespective of any zooming, say:
 *
 * <pre>dot.shapeRadius(function() 10 / this.scale)</pre>
 *
 * Note that the stroke width and font size are defined irrespective of scale
 * (i.e., in screen space) already. Also note that when a transform is applied
 * to a panel, the scale affects only the child marks, not the panel itself.
 *
 * @type number
 * @see pv.Panel#transform
 */
pv.Mark.prototype.scale = 1;

/**
 * Affects the drawing order amongst sibling marks.
 * Evaluation order is not affected.
 * A higher Z order value is drawn on top of a lower Z order value.
 * 
 * @type number
 * @private
 */
pv.Mark.prototype._zOrder = 0;

/**
 * @private The scene graph. The scene graph is an array of objects; each object
 * (or "node") corresponds to an instance of this mark and an element in the
 * data array. The scene graph can be traversed to lookup previously-evaluated
 * properties.
 *
 * @name pv.Mark.prototype.scene
 */

/**
 * The root parent panel. This may be undefined for "offscreen" marks that are
 * created for inheritance purposes only.
 *
 * @type pv.Panel
 * @name pv.Mark.prototype.root
 */

/**
 * The data property; an array of objects. The size of the array determines the
 * number of marks that will be instantiated; each element in the array will be
 * passed to property functions to compute the property values. Typically, the
 * data property is specified as a constant array, such as
 *
 * <pre>m.data([1, 2, 3, 4, 5]);</pre>
 *
 * However, it is perfectly acceptable to define the data property as a
 * function. This function might compute the data dynamically, allowing
 * different data to be used per enclosing panel. For instance, in the stacked
 * area graph example (see {@link #scene}), the data function on the area mark
 * dereferences each series.
 *
 * @type array
 * @name pv.Mark.prototype.data
 */

/**
 * The visible property; a boolean determining whether or not the mark instance
 * is visible. If a mark instance is not visible, its other properties will not
 * be evaluated. Similarly, for panels no child marks will be rendered.
 *
 * @type boolean
 * @name pv.Mark.prototype.visible
 */

/**
 * The left margin; the distance, in pixels, between the left edge of the
 * enclosing panel and the left edge of this mark. Note that in some cases this
 * property may be redundant with the right property, or with the conjunction of
 * right and width.
 *
 * @type number
 * @name pv.Mark.prototype.left
 */

/**
 * The right margin; the distance, in pixels, between the right edge of the
 * enclosing panel and the right edge of this mark. Note that in some cases this
 * property may be redundant with the left property, or with the conjunction of
 * left and width.
 *
 * @type number
 * @name pv.Mark.prototype.right
 */

/**
 * The top margin; the distance, in pixels, between the top edge of the
 * enclosing panel and the top edge of this mark. Note that in some cases this
 * property may be redundant with the bottom property, or with the conjunction
 * of bottom and height.
 *
 * @type number
 * @name pv.Mark.prototype.top
 */

/**
 * The bottom margin; the distance, in pixels, between the bottom edge of the
 * enclosing panel and the bottom edge of this mark. Note that in some cases
 * this property may be redundant with the top property, or with the conjunction
 * of top and height.
 *
 * @type number
 * @name pv.Mark.prototype.bottom
 */

/**
 * The cursor property; corresponds to the CSS cursor property. This is
 * typically used in conjunction with event handlers to indicate interactivity.
 *
 * @type string
 * @name pv.Mark.prototype.cursor
 * @see <a href="http://www.w3.org/TR/CSS2/ui.html#propdef-cursor">CSS2 cursor</a>
 */

/**
 * The title property; corresponds to the HTML/SVG title property, allowing the
 * general of simple plain text tooltips.
 *
 * @type string
 * @name pv.Mark.prototype.title
 */

/**
 * The events property; corresponds to the SVG pointer-events property,
 * specifying how the mark should participate in mouse events. The default value
 * is "painted". Supported values are:
 *
 * <p>"painted": The given mark may receive events when the mouse is over a
 * "painted" area. The painted areas are the interior (i.e., fill) of the mark
 * if a 'fillStyle' is specified, and the perimeter (i.e., stroke) of the mark
 * if a 'strokeStyle' is specified.
 *
 * <p>"all": The given mark may receive events when the mouse is over either the
 * interior (i.e., fill) or the perimeter (i.e., stroke) of the mark, regardless
 * of the specified fillStyle and strokeStyle.
 *
 * <p>"none": The given mark may not receive events.
 *
 * @type string
 * @name pv.Mark.prototype.events
 */

/**
 * The reverse property; a boolean determining whether marks are ordered from
 * front-to-back or back-to-front. SVG does not support explicit z-ordering;
 * shapes are rendered in the order they appear. Thus, by default, marks are
 * rendered in data order. Setting the reverse property to false reverses the
 * order in which they are rendered; however, the properties are still evaluated
 * (i.e., built) in forward order.
 *
 * @type boolean
 * @name pv.Mark.prototype.reverse
 */

/**
 * The instance identifier, for correspondence across animated transitions. If
 * no identifier is specified, correspondence is determined using the mark
 * index. Identifiers are not global, but local to a given mark.
 *
 * @type String
 * @name pv.Mark.prototype.id
 */

/**
 * Default properties for all mark types. By default, the data array is the
 * parent data as a single-element array; if the data property is not specified,
 * this causes each mark to be instantiated as a singleton with the parents
 * datum. The visible property is true by default, and the reverse property is
 * false.
 *
 * @type pv.Mark
 */
pv.Mark.prototype.defaults = new pv.Mark()
    // If the root panel has no data, this default function receives d === undefined -> [undefined]
    .data(function(d) { return [d]; })
    .visible(true)
    .antialias(true)
    .events("painted");

/**
 * Sets the prototype of this mark to the specified mark. Any properties not
 * defined on this mark may be inherited from the specified prototype mark, or
 * its prototype, and so on. The prototype mark need not be the same type of
 * mark as this mark. (Note that for inheritance to be useful, properties with
 * the same name on different mark types should have equivalent meaning.)
 *
 * @param {pv.Mark} proto the new prototype.
 * @returns {pv.Mark} this mark.
 * @see #add
 */
pv.Mark.prototype.extend = function(proto) {
  this.proto = proto;
  this.target = proto.target;
  return this;
};

/**
 * Adds a new mark of the specified type to the enclosing parent panel, whilst
 * simultaneously setting the prototype of the new mark to be this mark.
 *
 * @param {function} type the type of mark to add; a constructor, such as
 * <tt>pv.Bar</tt>.
 * @returns {pv.Mark} the new mark.
 * @see #extend
 */
pv.Mark.prototype.add = function(type) {
  return this.parent.add(type).extend(this);
};

/**
 * Defines a custom property on this mark. Custom properties are currently
 * fixed, in that they are initialized once per mark set (i.e., per parent panel
 * instance). Custom properties can be used to store local state for the mark,
 * such as data needed by other properties (e.g., a custom scale) or interaction
 * state.
 *
 * <p>WARNING We plan on changing this feature in a future release to define
 * standard properties, as opposed to <i>fixed</i> properties that behave
 * idiosyncratically within event handlers. Furthermore, we recommend storing
 * state in an external data structure, rather than tying it to the
 * visualization specification as with defs.
 *
 * @param {string} name the name of the local variable.
 * @param {function} [v] an optional initializer; may be a constant or a
 * function.
 */
pv.Mark.prototype.def = function(name, v) {
  this.propertyMethod(name, true);
  return this[name](arguments.length > 1 ? v : null);
};

/**
 * Affects the drawing order amongst sibling marks.
 * Evaluation order is not affected.
 * A higher Z order value is drawn on top of a lower Z order value. 
 * 
 * @param {number} zOrder the Z order of the mark. 
 * @type number
 */
pv.Mark.prototype.zOrder = function(zOrder){
    if(!arguments.length) { return this._zOrder; }
    
    zOrder = (+zOrder) || 0; // NaN -> 0
    
    if(this._zOrder !== zOrder) {
        var p = this.parent;
        
        if(p && this._zOrder !== 0) { p.zOrderChildCount--; }
        
        this._zOrder = zOrder;
        
        if(p && this._zOrder !== 0) { p.zOrderChildCount++; }
    }
    
    return this;
};

/**
 * Returns an anchor with the specified name. All marks support the five
 * standard anchor names:<ul>
 *
 * <li>top
 * <li>left
 * <li>center
 * <li>bottom
 * <li>right
 *
 * </ul>In addition to positioning properties (left, right, top bottom), the
 * anchors support text rendering properties (text-align, text-baseline). Text is
 * rendered to appear inside the mark by default.
 *
 * <p>To facilitate stacking, anchors are defined in terms of their opposite
 * edge. For example, the top anchor defines the bottom property, such that the
 * mark extends upwards; the bottom anchor instead defines the top property,
 * such that the mark extends downwards. See also {@link pv.Layout.Stack}.
 *
 * <p>While anchor names are typically constants, the anchor name is a true
 * property, which means you can specify a function to compute the anchor name
 * dynamically. See the {@link pv.Anchor#name} property for details.
 *
 * @param {string} name the anchor name; either a string or a property function.
 * @returns {pv.Anchor} the new anchor.
 */
pv.Mark.prototype.anchor = function(name) {
  if (!name) name = "center"; // default anchor name
  return new pv.Anchor(this)
    .name(name)
    .data(function() {
        return this.scene.target.map(function(s) { return s.data; });
      })
    .visible(function() {
        return this.scene.target[this.index].visible;
      })
    .id(function() {
        return this.scene.target[this.index].id;
      })
    .left(function() {
        var s = this.scene.target[this.index], w = s.width || 0;
        switch (this.name()) {
          case "bottom":
          case "top":
          case "center": return s.left + w / 2;
          case "left": return null;
        }
        return s.left + w;
      })
    .top(function() {
        var s = this.scene.target[this.index], h = s.height || 0;
        switch (this.name()) {
          case "left":
          case "right":
          case "center": return s.top + h / 2;
          case "top": return null;
        }
        return s.top + h;
      })
    .right(function() {
        var s = this.scene.target[this.index];
        return this.name() == "left" ? s.right + (s.width || 0) : null;
      })
    .bottom(function() {
        var s = this.scene.target[this.index];
        return this.name() == "top" ? s.bottom + (s.height || 0) : null;
      })
    .textAlign(function() {
        switch (this.name()) {
          case "bottom":
          case "top":
          case "center": return "center";
          case "right": return "right";
        }
        return "left";
      })
    .textBaseline(function() {
        switch (this.name()) {
          case "right":
          case "left":
          case "center": return "middle";
          case "top": return "top";
        }
        return "bottom";
      });
};

/** @deprecated Replaced by {@link #target}. */
pv.Mark.prototype.anchorTarget = function() {
  return this.target;
};

/**
 * Alias for setting the left, right, top and bottom properties simultaneously.
 *
 * @see #left
 * @see #right
 * @see #top
 * @see #bottom
 * @returns {pv.Mark} this.
 */
pv.Mark.prototype.margin = function(n) {
  return this.left(n).right(n).top(n).bottom(n);
};

/**
 * @private Returns the current instance of this mark in the scene graph. This
 * is typically equivalent to <tt>this.scene[this.index]</tt>, however if the
 * scene or index is unset, the default instance of the mark is returned. If no
 * default is set, the default is the last instance. Similarly, if the scene or
 * index of the parent panel is unset, the default instance of this mark in the
 * last instance of the enclosing panel is returned, and so on.
 *
 * @returns a node in the scene graph.
 */
pv.Mark.prototype.instance = function(defaultIndex) {
  var scene = this.scene || this.parent.instance(-1).children[this.childIndex],
      index = !arguments.length || this.hasOwnProperty("index") ? this.index : defaultIndex;
  return scene[index < 0 ? scene.length - 1 : index];
};

/**
 * @private Find the instances of this mark that match source.
 *
 * @see pv.Anchor
 */
pv.Mark.prototype.instances = function(source) {
  var mark = this, index = [], scene;

  /* Mirrored descent. */
  while (!(scene = mark.scene)) {
    source = source.parent;
    index.push({index: source.index, childIndex: mark.childIndex});
    mark = mark.parent;
  }
  while (index.length) {
    var i = index.pop();
    scene = scene[i.index].children[i.childIndex];
  }

  /*
   * When the anchor target is also an ancestor, as in the case of adding
   * to a panel anchor, only generate one instance per panel. Also, set
   * the margins to zero, since they are offset by the enclosing panel.
   */
  if (this.hasOwnProperty("index")) {
    var s = pv.extend(scene[this.index]);
    s.right = s.top = s.left = s.bottom = 0;
    return [s];
  }
  return scene;
};

/**
 * @private Returns the first instance of this mark in the scene graph. This
 * method can only be called when the mark is bound to the scene graph (for
 * example, from an event handler, or within a property function).
 *
 * @returns a node in the scene graph.
 */
pv.Mark.prototype.first = function() {
  return this.scene[0];
};

/**
 * @private Returns the last instance of this mark in the scene graph. This
 * method can only be called when the mark is bound to the scene graph (for
 * example, from an event handler, or within a property function). In addition,
 * note that mark instances are built sequentially, so the last instance of this
 * mark may not yet be constructed.
 *
 * @returns a node in the scene graph.
 */
pv.Mark.prototype.last = function() {
  return this.scene[this.scene.length - 1];
};

/**
 * @private Returns the previous instance of this mark in the scene graph, or
 * null if this is the first instance.
 *
 * @returns a node in the scene graph, or null.
 */
pv.Mark.prototype.sibling = function() {
  return (this.index == 0) ? null : this.scene[this.index - 1];
};

/**
 * @private Returns the current instance in the scene graph of this mark, in the
 * previous instance of the enclosing parent panel. May return null if this
 * instance could not be found.
 *
 * @returns a node in the scene graph, or null.
 */
pv.Mark.prototype.cousin = function() {
  var p = this.parent, s = p && p.sibling();
  return (s && s.children) ? s.children[this.childIndex][this.index] : null;
};

/**
 * Renders this mark, including recursively rendering all child marks if this is
 * a panel. This method finds all instances of this mark and renders them. This
 * method descends recursively to the level of the mark to be rendered, finding
 * all visible instances of the mark. After the marks are rendered, the scene
 * and index attributes are removed from the mark to restore them to a clean
 * state.
 *
 * <p>If an enclosing panel has an index property set (as is the case inside in
 * an event handler), then only instances of this mark inside the given instance
 * of the panel will be rendered; otherwise, all visible instances of the mark
 * will be rendered.
 */
pv.Mark.prototype.render = function() {
    /* For the first render, take it from the top. */
    if (this.parent && !this.root.scene) {
      this.root.render();
      return;
    }
    
    this.renderCore();
};

pv.Mark.prototype.renderCore = function() {
    var parent = this.parent,
        stack = pv.Mark.stack;

    /* Record the path to this mark. */
    var indexes = []; // [root excluded], ..., this.parent.childIndex, this.childIndex
    for (var mark = this; mark.parent; mark = mark.parent) { indexes.unshift(mark.childIndex); }

    var L = indexes.length;

    /** @private
     * Starts with mark = root with the call:
     *   render(this.root, 0, 1);
     *
     * when in the context of the first ascendant of 'this' that has an index set.
     * The stack will already be filled up to the context scene/index.
     */
    function render(mark, depth, scale) {
        mark.scale = scale;
        if (depth < L) {
            // At least one more child index to traverse, for getting to the initial mark
            
            // If addStack, then we've reached a level not covered by #context.
            // TODO: Can't think of a situation in which addStack and index is an own property.  
            var addStack = (depth >= stack.length);
            if(addStack) { stack.unshift(null); }
            try {
                if (mark.hasOwnProperty("index")) {
                    // Render only instances of the outer "this" mark
                    // that are found along along this branch.
                    renderCurrentInstance(mark, depth, scale, addStack);
                } else {
                    // Traverse every branch that leads to
                    // instances of the outer "this" mark.
                    for (var i = 0, n = mark.scene.length; i < n; i++) {
                        mark.index = i;
                        renderCurrentInstance(mark, depth, scale, addStack);
                    }
                    delete mark.index;
                }
            } finally {
                if(addStack) { stack.shift(); }
            }
        } else {
            // Got to a "scenes" node of mark = outer "this".
            // Build and UpdateAll
            mark.build();

            /*
             * In the update phase, the scene is rendered by creating and updating
             * elements and attributes in the SVG image. No properties are evaluated
             * during the update phase; instead the values computed previously in the
             * build phase are simply translated into SVG. The update phase is
             * decoupled (see pv.Scene) to allow different rendering engines.
             */
            pv.Scene.scale = scale;
            pv.Scene.updateAll(mark.scene);
        }
      
        delete mark.scale;
    }

    /**
     * @private Recursively renders the current instance of the specified mark.
     * This is slightly tricky because `index` and `scene` properties may or may
     * not already be set; if they are set, it means we are rendering only a
     * specific instance; if they are unset, we are rendering all instances.
     * Furthermore, we must preserve the original context of these properties when
     * rendering completes.
     *
     * <p>Another tricky aspect is that the `scene` attribute should be set for
     * any preceding children, so as to allow property chaining. This is
     * consistent with first-pass rendering.
     */
    function renderCurrentInstance(mark, depth, scale, fillStack) {
        var s = mark.scene[mark.index], i;
        if (s.visible) {
            var childMarks  = mark.children;
            var childScenez = s.children;
            var childIndex  = indexes[depth];
            var childMark   = childMarks[childIndex];
    
            /* If current child's scene is not set, include it in the loops below. */
            if(!childMark.scene) { childIndex++; }
    
            /* Set preceding (and possibly self) child marks' scenes. */
            for (i = 0; i < childIndex; i++) { childMarks[i].scene = childScenez[i]; }
    
            if(fillStack) { stack[0] = s.data; }
    
            render(childMark, depth + 1, scale * s.transform.k);
    
            /* Clear preceding (and possibly self) child mark's scenes. 
             * It's cheaper to set to null than to delete. */
            for (i = 0; i < childIndex; i++) { childMarks[i].scene = undefined; }
        }
    }

    /* Bind this mark's property definitions. */
    this.bind();

    /* The render context is the first ancestor with an explicit index. */
    while (parent && !parent.hasOwnProperty("index")) { parent = parent.parent; }

    /* Recursively render all instances of this mark. */
    this.context(
        parent ? parent.scene : undefined,
        parent ? parent.index : -1,
        function() {
            // pv.Mark.stack contains the data until parent.scene, parent.index
            // parent and all its ascendants have scene, index and scale set.
            // Direct children of parent have scene and scale set.
            
            render(this.root, 0, 1);
        });
};

/**
 * @private In the bind phase, inherited property definitions are cached so they
 * do not need to be queried during build.
 * 
 * NOTE: pv.Panel#bind binds locally and then calls #bind on all of its children.
 */
pv.Mark.prototype.bind = function() {
  var seen = {},
      data,
      
      /* Required props (no defs) */
      required = [],    
      
      /* 
       * Optional props/defs by type
       * 0 - def/value, 
       * 1 - def/fun, 
       * 2 - prop/value, 
       * 3 - prop/fun 
       */
      types = [[], [], [], []];
  
  /*
   * **Evaluation** order (not precedence order for choosing props/defs)
   * 0) DEF and PROP _values_ are always already "evaluated".
   *    * Defined PROPs for which a value/fun was not specified
   *      get the value null.
   * 
   * 1) DEF _functions_
   *    * once per parent instance
   *    * with parent instance's stack
   *    
   *    1.1) Defaulted
   *        * from farthest proto mark to closest
   *            * on each level the first defined is the first evaluated
   *    
   *    1.2) Explicit
   *        * idem
   *    
   * 2) Data PROP _value_ or _function_
   *    * once per all child instances
   *    * with parent instance's stack
   * 
   * ONCE PER INSTANCE
   * 
   * 3) Required kind PROP _functions_ (id, datum, visible)
   *    2.1) Defaulted
   *        * idem
   *    2.2) Explicit
   *        * idem
   *
   * 3) Optional kind PROP _functions_ (when instance.visible=true)
   *    3.1) Defaulted
   *        * idem
   *    3.2) Explicit
   *        * idem
   *
   * 4) Implied PROPs (when instance.visible=true)
   */
  /** 
   * Scans the proto chain for the specified mark.
   */
  function bind(mark) {
    do {
      var properties = mark.$properties;
      /*
       * On each mark properties are traversed in reverse
       * so that, below, when reverse() is called
       * function props/defs recover their original defining order.
       * 
       * M1 -> P1_0, P1_1, P1_2, P1_3
       * ^
       * |
       * M2 -> P2_0, P2_1
       * ^
       * |
       * M3 -> P3_0, P3_1
       * 
       * List     -> P3_1, P3_0, P2_1, P2_0, P1_3, P1_2, P1_1, P1_0
       * 
       * Reversed -> P1_0, P1_1, P1_2, P1_3, P2_0, P2_1, P3_0, P3_1
       */
      
      for (var i = properties.length - 1; i >= 0 ; i--) {
        var p = properties[i];
        var pLeaf = seen[p.name];
        if (!pLeaf) {
          seen[p.name] = p;
          
          switch (p.name) {
            case "data": 
              data = p;
              break;

            case "visible":
            case "id":
              required.push(p);
              break;

            default: 
              types[p.type].push(p); 
              break;
          }
        } else if(pLeaf.type === 3){ // prop/fun
            // Chain properties
            //
            // seen[name]-> (leaf).proto-> (B).proto-> (C).proto-> (root)
            //                    .root-------------------------------^
            var pRoot = pLeaf.root;
            if(!pRoot){
                pLeaf.proto = 
                pLeaf.root  = p;
            } else if(!pRoot.proto){
                pRoot.proto = p;
                pLeaf.root  = p;
            }
        }
      }
    } while ((mark = mark.proto));
  }

  /* Scan the proto chain for all defined properties. */
  bind(this);
  bind(this.defaults);
  types[1].reverse();
  types[3].reverse();

  /* Any undefined properties are null. */
  var mark = this;
  do {
    for (var name in mark.properties) {
        if (!(name in seen)) {
          types[2].push(seen[name] = {name: name, type: 2, value: null});
        }
    }
  } while ((mark = mark.proto));

  /* Define setter-getter for inherited defs. */
  var defs = types[0].concat(types[1]);
  for (var i = 0; i < defs.length; i++) {
    this.propertyMethod(defs[i].name, true);
  }

  /* Setup binds to evaluate constants before functions. */
  this.binds = {
    properties: seen,
    net:        {}, // name -> net index // null = 0 is default position
    data:       data,
    defs:       defs,
    required:   required,
    
    // NOTE: although defs are included in the optional properties
    // they are evaluated once per parent instance, before other non-def properties.
    // Yet, for each instance, the already evaluated's def values
    // are copied to the instance scene - all instances share the same value...
    // Only to satisfy this copy operation they go in the instance-props array.
    optional:   pv.blend(types)
  };
};

pv.Mark.prototype.updateNet = function(pDependent, netIndex){
    var binds = this.binds;
    var props = binds.properties;
    var net   = binds.net;
    
    propagateRecursive(pDependent, netIndex);
    
    function propagateRecursive(p, minNetIndex){
        if(minNetIndex > (net[p.name] || 0)){
            net[p.name] = minNetIndex;
            var deps = p.dependents;
            if(deps){
                minNetIndex++;
                for(var depName in deps){
                    if(deps.hasOwnProperty(depName)){
                        var pDep = props[depName];
                        if(pDep){
                            propagateRecursive(pDep, minNetIndex);
                        }
                    }
                }
            }
        }
    }
};

/**
 * @private Evaluates properties and computes implied properties. Properties are
 * stored in the {@link #scene} array for each instance of this mark.
 *
 * <p>As marks are built recursively, the {@link #index} property is updated to
 * match the current index into the data array for each mark. Note that the
 * index property is only set for the mark currently being built and its
 * enclosing parent panels. The index property for other marks is unset, but is
 * inherited from the global <tt>Mark</tt> class prototype. This allows mark
 * properties to refer to properties on other marks <i>in the same panel</i>
 * conveniently; however, in general it is better to reference mark instances
 * specifically through the scene graph rather than depending on the magical
 * behavior of {@link #index}.
 *
 * <p>The root scene array has a special property, <tt>data</tt>, which stores
 * the current data stack. The first element in this stack is the current datum,
 * followed by the datum of the enclosing parent panel, and so on. The data
 * stack should not be accessed directly; instead, property functions are passed
 * the current data stack as arguments.
 *
 * <p>The evaluation of the <tt>data</tt> and <tt>visible</tt> properties is
 * special. The <tt>data</tt> property is evaluated first; unlike the other
 * properties, the data stack is from the parent panel, rather than the current
 * mark, since the data is not defined until the data property is evaluated.
 * The <tt>visible</tt> property is subsequently evaluated for each instance;
 * only if true will the {@link #buildInstance} method be called, evaluating
 * other properties and recursively building the scene graph.
 *
 * <p>If this mark is being re-built, any old instances of this mark that no
 * longer exist (because the new data array contains fewer elements) will be
 * cleared using {@link #clearInstance}.
 *
 * @param parent the instance of the parent panel from the scene graph.
 */
pv.Mark.prototype.build = function() {
  var scene = this.scene, stack = pv.Mark.stack;
  if (!scene) {
    // Create _scenes_
    scene = this.scene = [];
    scene.mark = this;
    scene.type = this.type;
    scene.childIndex = this.childIndex;
    if (this.parent) {
      scene.parent = this.parent.scene;
      scene.parentIndex = this.parent.index;
    }
  }

  /* Resolve anchor target. */
  if (this.target) scene.target = this.target.instances(scene);

  /* Evaluate defs. */
  if (this.binds.defs.length) {
    var defs = scene.defs;
    if (!defs) scene.defs = defs = {};
    for (var i = 0; i < this.binds.defs.length; i++) {
      var p = this.binds.defs[i], d = defs[p.name];
      if (!d || (p.id > d.id)) {
        defs[p.name] = {
          id: 0, // this def will be re-evaluated on next build
          value: (p.type & 1) ? p.value.apply(this, stack) : p.value
        };
      }
    }
  }

  /* Evaluate special data property.
   * With the stack of the parent!!
   * this.index is -1
   */
  var data = this.evalProperty(this.binds.data);

  /* Create, update and delete scene nodes. */
  var markProto = pv.Mark.prototype;
  stack.unshift(null);
  try {
      /* Adjust scene length to data length. */
      var L = scene.length = data.length;
      for (var i = 0 ; i < L ; i++) {
        markProto.index = this.index = i;
        
        // Create scene instance
        var instance = scene[i] || (scene[i] = {});
        
        /* Fill special data property and update the stack. */
        instance.data = stack[0] = data[i];
        
        this.buildInstance(instance);
      }
  } finally {
      markProto.index = -1;
      delete this.index;
      stack.shift();
  }
  
  return this;
};

/**
 * @private Evaluates the specified array of properties for the specified
 * instance <tt>s</tt> in the scene graph.
 *
 * @param s a node in the scene graph; the instance of the mark to build.
 * @param properties an array of properties.
 */
pv.Mark.prototype.buildProperties = function(s, properties) {
  var stack = pv.Mark.stack;
  for (var i = 0, n = properties.length; i < n; i++) {
    var p = properties[i];
    
    // repeated here, for performance
    var v;
    switch(p.type){
        /* 2 most common first */
        case 3:
            var oldProtoProp = pv.propertyProto;
            try{
                pv.propertyProto = p.proto;
                v = p.value.apply(this, stack);
            } finally {
                pv.propertyProto = oldProtoProp;
            }
            break;
            
        case 2: 
            v = p.value;
            break;
      
        // copy already evaluated def value to each instance's scene
        case 0:
        case 1:
            v = this.scene.defs[p.name].value;
            break;
    }
    
    s[p.name] = v;
  }
};

pv.Mark.prototype.delegate = function(dv, tag){
    var protoProp = pv.propertyProto;
    if(protoProp && (!tag || protoProp.tag === tag)){ 
        var value = this.evalProperty(protoProp);
        if(value !== undefined){
            return value;
        }
    }
    
    return dv;
};

pv.Mark.prototype.hasDelegate = function(tag) {
    var protoProp = pv.propertyProto;
    return !!protoProp && (!tag || protoProp.tag === tag);
};

pv.Mark.prototype.evalProperty = function(p) {
    switch(p.type) {
        /* 2 most common first */
        case 3:
            var oldProtoProp = pv.propertyProto;
            try {
                pv.propertyProto = p.proto;
                return p.value.apply(this, pv.Mark.stack);
            } finally {
                pv.propertyProto = oldProtoProp;
            }
        
        case 2: return p.value;
      
        // copy already evaluated def value to each instance's scene
        case 0:
        case 1: return this.scene.defs[p.name].value; 
    }
};

pv.Mark.prototype.buildPropertiesWithDepTracking = function(s, properties) {
    // Current bindings
    var net = this.binds.net;
    var netIndex, newNetIndex, netDirtyProps, prevNetDirtyProps, 
        propertyIndexes, evaluatedProps;
    var stack = pv.Mark.stack;
    
    var n = properties.length;
    try{
        while(true){
            netDirtyProps = null;
            evaluatedProps = {};
            for (var i = 0 ; i < n; i++) {
                var p = properties[i];
                var name = p.name;
                evaluatedProps[name] = true;
                
                // Only re-evaluate properties marked dirty on the previous iteration
                if(!prevNetDirtyProps || prevNetDirtyProps[name]){
                    var v;
                    switch (p.type) {
                        case 3:
                            pv.propertyEval = p;
                            pv.propertyEvalNetIndex = netIndex = (net[name] || 0);
                            pv.propertyEvalDependencies = null;
                            
                            // repeated here, for performance
                            var oldProtoProp = pv.propertyProto;
                            try{
                                pv.propertyProto = p.proto;
                                v = p.value.apply(this,  stack);
                            } finally {
                                pv.propertyProto = oldProtoProp;
                            }
                            
                            newNetIndex = pv.propertyEvalNetIndex;
                            if(newNetIndex > netIndex){
                                var evalDeps = pv.propertyEvalDependencies;
                                for(var depName in evalDeps){
                                    // If dependent property has not yet been evaluated
                                    // set it as dirty
                                    if(evalDeps.hasOwnProperty(depName) &&
                                       !evaluatedProps.hasOwnProperty(name)){
                                        if(!netDirtyProps){
                                            netDirtyProps = {};
                                        }
                                        netDirtyProps[depName] = true;
                                    }
                                }
                                
                                this.updateNet(p, newNetIndex);
                            }
                            break;
                        
                        case 2:
                            v = p.value;
                            break;
                            
                        // copy already evaluated def value to each instance's scene
                        case 0:
                        case 1:
                            v = this.scene.defs[name].value;
                            break;
                    }
                     
                    s[name] = v;
                }
            }
            
            if(!netDirtyProps){
                break;
            }
            
            prevNetDirtyProps = netDirtyProps;
            
            // Sort properties on net index and repeat...
            
            propertyIndexes = pv.numerate(properties, function(p){ return p.name; });
            
            properties.sort(function(pa, pb){
                var comp = pv.naturalOrder(net[pa.name] || 0, net[pb.name] || 0);
                if(!comp){
                    // Force mantaining original order
                    comp = pv.naturalOrder(propertyIndexes[pa.name], propertyIndexes[pb.name]);
                }
                return comp;
            });
            
            propertyIndexes = null;
        }
    } finally {
        pv.propertyEval = null;
        pv.propertyEvalNetIndex = null;
        pv.propertyEvalDependencies = null;
    }
};
  
/**
 * @private Evaluates all of the properties for this mark for the specified
 * instance <tt>s</tt> in the scene graph. The set of properties to evaluate is
 * retrieved from the {@link #properties} array for this mark type (see {@link
 * #type}).  After these properties are evaluated, any <b>implied</b> properties
 * may be computed by the mark and set on the scene graph; see
 * {@link #buildImplied}.
 *
 * <p>For panels, this method recursively builds the scene graph for all child
 * marks as well. In general, this method should not need to be overridden by
 * concrete mark types.
 *
 * @param s a node in the scene graph; the instance of the mark to build.
 */
pv.Mark.prototype.buildInstance = function(s) {
  this.buildProperties(s, this.binds.required);
  if (s.visible) {
    if(this.index === 0){
        this.buildPropertiesWithDepTracking(s, this.binds.optional);
    } else {
        this.buildProperties(s, this.binds.optional);
    }
    
    this.buildImplied(s);
  }
};

/**
 * @private Computes the implied properties for this mark for the specified
 * instance <tt>s</tt> in the scene graph. Implied properties are those with
 * dependencies on multiple other properties; for example, the width property
 * may be implied if the left and right properties are set. This method can be
 * overridden by concrete mark types to define new implied properties, if
 * necessary.
 *
 * @param s a node in the scene graph; the instance of the mark to build.
 */
pv.Mark.prototype.buildImplied = function(s) {
  var l = s.left;
  var r = s.right;
  var t = s.top;
  var b = s.bottom;

  /* Assume width and height are zero if not supported by this mark type. */
  var p = this.properties;
  var w = p.width ? s.width : 0;
  var h = p.height ? s.height : 0;

  /* Compute implied width, right and left. */
  var instance;
  var checked;
  
  if(w == null || r == null || l == null){
      instance = this.parent ? this.parent.instance() : null;
      checked = true;
      var width = instance ? instance.width : (w + l + r);
      if (w == null) {
        w = width - (r = r || 0) - (l = l || 0);
      } else if (r == null) {
        if (l == null) {
          l = r = (width - w) / 2;
        } else {
          r = width - w - l;
        }
      } else {
        l = width - w - r;
      }
  }
  
  /* Compute implied height, bottom and top. */
  if (h == null || b == null || t == null) {
      if(!checked){
          instance = this.parent ? this.parent.instance() : null;
      }
      
      var height = instance ? instance.height : (h + t + b);
      if (h == null) {
        h = height - (t = t || 0) - (b = b || 0);
      } else if (b == null) {
        if (t == null) {
          b = t = (height - h) / 2;
        } else {
          b = height - h - t;
        }
      } else {
        t = height - h - b;
      }
  }
  
  s.left = l;
  s.right = r;
  s.top = t;
  s.bottom = b;

  /* Only set width and height if they are supported by this mark type. */
  if (p.width ) s.width  = w;
  if (p.height) s.height = h;

  /* Set any null colors to pv.FillStyle.transparent. */
  if (p.textStyle   && !s.textStyle  ) s.textStyle   = pv.FillStyle.transparent;
  if (p.fillStyle   && !s.fillStyle  ) s.fillStyle   = pv.FillStyle.transparent;
  if (p.strokeStyle && !s.strokeStyle) s.strokeStyle = pv.FillStyle.transparent;
};

/**
 * Returns the current location of the mouse (cursor) relative to this mark's
 * parent. The <i>x</i> coordinate corresponds to the left margin, while the
 * <i>y</i> coordinate corresponds to the top margin.
 *
 * @returns {pv.Vector} the mouse location.
 */
pv.Mark.prototype.mouse = function() {
    var n = this.root.canvas(),
        ev = pv.event,
        x = ev.pageX,
        y = ev.pageY;
    
      // Compute xy-coordinates relative to the panel.
      var offset = pv.elementOffset(n);
      if(offset){
          x -= offset.left;
          y -= offset.top;

          var computed = pv.getWindow(n.ownerDocument).getComputedStyle(n, null);
          if(computed){
              x -= parseFloat(computed.paddingLeft || 0);
              y -= parseFloat(computed.paddingTop  || 0);
          }
      }
      
      /* Compute the inverse transform of all enclosing panels. */
      var t = pv.Transform.identity,
          p = this.properties.transform ? this : this.parent,
          pz = [];
      
      do { 
          pz.push(p); 
      } while ((p = p.parent));
      
      while ((p = pz.pop())) {
          var pinst = p.instance();
          t = t.translate(pinst.left, pinst.top)
               .times(pinst.transform);
      }
      
      t = t.invert();
      return pv.vector(x * t.k + t.x, y * t.k + t.y);
};

/**
 * Registers an event handler for the specified event type with this mark. When
 * an event of the specified type is triggered, the specified handler will be
 * invoked. The handler is invoked in a similar method to property functions:
 * the context is <tt>this</tt> mark instance, and the arguments are the full
 * data stack. Event handlers can use property methods to manipulate the display
 * properties of the mark:
 *
 * <pre>m.event("click", function() this.fillStyle("red"));</pre>
 *
 * Alternatively, the external data can be manipulated and the visualization
 * redrawn:
 *
 * <pre>m.event("click", function(d) {
 *     data = all.filter(function(k) k.name == d);
 *     vis.render();
 *   });</pre>
 *
 * The return value of the event handler determines which mark gets re-rendered.
 * Use defs ({@link #def}) to set temporary state from event handlers.
 *
 * <p>The complete set of event types is defined by SVG; see the reference
 * below. The set of supported event types is:<ul>
 *
 * <li>click
 * <li>mousedown
 * <li>mouseup
 * <li>mouseover
 * <li>mousemove
 * <li>mouseout
 *
 * </ul>Since Protovis does not specify any concept of focus, it does not
 * support key events; these should be handled outside the visualization using
 * standard JavaScript. In the future, support for interaction may be extended
 * to support additional event types, particularly those most relevant to
 * interactive visualization, such as selection.
 *
 * <p>TODO In the current implementation, event handlers are not inherited from
 * prototype marks. They must be defined explicitly on each interactive mark. 
 * More than one event handler for a given event type <i>can</i> be defined.
 * The return values of each handler, if any and are marks, 
 * are rendered at the end of every handler having been called.
 *
 * @see <a href="http://www.w3.org/TR/SVGTiny12/interact.html#SVGEvents">SVG events</a>
 * @param {string} type the event type.
 * @param {function} handler the event handler.
 * @returns {pv.Mark} this.
 */
pv.Mark.prototype.event = function(type, handler) {
  handler = pv.functor(handler);
  
  var handlers = this.$handlers[type];
  if(!handlers) {
      handlers = handler; 
  } else if(handlers instanceof Array) {
      handlers.push(handler);
  } else {
      handlers = [handlers, handler];
  }
  
  this.$hasHandlers = true;
  this.$handlers[type] = handlers;
  return this;
};

/** @private Evaluates the function <i>f</i> with the specified context.
 * The <tt>this</tt> mark is the JavaScript context on which
 * the function <i>f</i> is called, but plays no other role.
 * It may be the case that <tt>scenes.mark</tt> is not equal to <tt>this</tt>.
 */
pv.Mark.prototype.context = function(scene, index, f) {
  var proto  = pv.Mark.prototype,
      stack  = pv.Mark.stack,
      oscene = pv.Mark.scene,
      oindex = proto.index;

  /** @private Sets the context. */
  function apply(scene, index) {
    pv.Mark.scene = scene;
    proto.index = index;
    if (!scene) {
        return;
    }
    
    var that = scene.mark,
        mark = that,
        ancestors = []; // that, that.parent, ..., root

    /* Set scene and index in ancestors and self; populate data stack. */
    do {
      ancestors.push(mark);
      stack.push(scene[index].data);
      
      mark.index = index;
      mark.scene = scene;

      if((mark = mark.parent)){
        index = scene.parentIndex;
        scene = scene.parent;
      }
    } while(mark);

    /* Set ancestors' scale, excluding "that"; requires top-down. */
    var k = 1; // root's scale is 1
    for (var i = ancestors.length - 1; i > 0; i--) {
      mark = ancestors[i];
      mark.scale = k; // accumulated scale on mark

      // children's scale
      k *= mark.scene[mark.index].transform.k;
    }
    
    that.scale = k;

    /* Set direct children of "that"'s scene and scale. */
    var children = that.children, n;
    if (children && (n = children.length) > 0){
      // "that" is a panel, has a transform.
      var thatInst = that.scene[that.index];
      k *= thatInst.transform.k;
      
      var childScenez = thatInst.children;
      for (var i = 0 ; i < n; i++) {
        mark = children[i];
        mark.scene = childScenez[i];
        mark.scale = k;
      }
    }
  }

  /** @private Clears the context. */
  function clear(scene/*, index*/) {
    if (!scene) return;
    var that = scene.mark,
        mark;

    /* Reset children. */
    var children = that.children;
    if (children){
      for (var i = 0, n = children.length ; i < n; i++) {
        mark = children[i];
        // It's generally faster to set to something, than to delete
        mark.scene = undefined;
        mark.scale = 1;
      }
    }
    
    /* Reset ancestors. */
    mark = that;
    var parent;
    do{
      stack.pop();
      delete mark.index; // must be deleted!
      
      if ((parent = mark.parent)) {
        // It's generally faster to set to something, than to delete
        mark.scene = undefined;
        mark.scale = 1;
      }
    } while((mark = parent));
  }

  /* Context switch, invoke the function, then switch back. */
  if(scene && scene === oscene && index === oindex){
      // already there
      try{
          f.apply(this, stack);
      } catch (ex) {
          pv.error(ex);
          throw ex;
      } finally {
          // Some guys like setting index to -1...
          pv.Mark.scene = oscene;
          proto.index = oindex;
      }
    } else {
      clear(oscene, oindex);
      apply(scene,   index);
      try {
        f.apply(this, stack);
      } catch (ex) {
          pv.error(ex);
          throw ex;
      } finally {
        clear(scene,   index);
        apply(oscene, oindex);
      }
    }
};

pv.Mark.getEventHandler = function(type, scenes, index, event){
  var handler = scenes.mark.$handlers[type];
  if(handler){
    return [handler, type, scenes, index, event];
  }
   
  var parentScenes = scenes.parent;
  if(parentScenes){
    return this.getEventHandler(type, parentScenes, scenes.parentIndex, event);
  }
};

/** @private Execute the event listener, then re-render the returned mark. */
pv.Mark.dispatch = function(type, scenes, index, event) {
  
  var root = scenes.mark.root;
  if(root.animatingCount){
      return true;
  }
  var handlerInfo;
  var interceptors = root.$interceptors && root.$interceptors[type];
  if(interceptors){
    for(var i = 0, L = interceptors.length ; i < L ; i++){
      handlerInfo = interceptors[i](type, event);
      if(handlerInfo){
        break;
      }

      if(handlerInfo === false){
        // Consider handled
        return true;
      }
    }
  }

  if(!handlerInfo){
    handlerInfo = this.getEventHandler(type, scenes, index, event);
    if(!handlerInfo){
      return false;
    }
  }

  return this.handle.apply(this, handlerInfo);
};

pv.Mark.handle = function(handler, type, scenes, index, event){
    var m = scenes.mark;
    
    m.context(scenes, index, function(){
      var stack = pv.Mark.stack.concat(event);
      if(handler instanceof Array){
          var ms;
          handler.forEach(function(hi){
            var mi = hi.apply(m, stack);
            if(mi && mi.render) {
                (ms || (ms = [])).push(mi);
            }
          });
        
          if(ms) {
              ms.forEach(function(mi){
                mi.render();
              });
          }
      } else {
        m = handler.apply(m, stack);
        if (m && m.render) {
            m.render();
        }
      }
  });
  
  return true;
};

/**
 * Registers an event interceptor function.
 * 
 * @param {string} type the event type
 * @param {function} handler the interceptor function
 * @param {boolean} [before=false] indicates that the interceptor should be applied <i>before</i> "after" interceptors
 */
pv.Mark.prototype.addEventInterceptor = function(type, handler, before){
    var root = this.root;
    if(root){
        var interceptors = root.$interceptors || (root.$interceptors = {});
        var list = interceptors[type] || (interceptors[type] = []);
        if(before){
            list.unshift(handler);
        } else {
            list.push(handler);
        }
    }
};

/**
 * Iterates through all visible instances that
 * this mark has rendered.
 */
pv.Mark.prototype.eachInstance = function(fun, ctx){
    var mark = this,
        indexes = [];

    /* Go up to the root and register our way back.
     * The root mark never "looses" its scene.
     */
    while(mark.parent){
        indexes.unshift(mark.childIndex);
        mark = mark.parent;
    }

    // mark != null

    // root scene exists if rendered at least once
    var rootScene = mark.scene;
    if(!rootScene){
        return;
    }
    
    var L = indexes.length;

    function mapRecursive(scene, level, toScreen){
        var D = scene.length;
        if(D > 0){
            var isLastLevel = level === L,
                childIndex;

            if(!isLastLevel) {
                childIndex = indexes[level];
            }

            for(var index = 0 ; index < D ; index++){
                var instance = scene[index];
                if(instance.visible){
                    if(level === L){
                        fun.call(ctx, scene, index, toScreen);
                    } else {
                        var childScene = instance.children[childIndex];
                        if(childScene){ // Some nodes might have not been rendered???
                        var childToScreen = toScreen
                                            .times(instance.transform)
                                            .translate(instance.left, instance.top);

                            mapRecursive(childScene, level + 1, childToScreen);
                        }
                    }
                }
            }
        }
    }

    mapRecursive(rootScene, 0, pv.Transform.identity);
};

pv.Mark.prototype.toScreenTransform = function(){
    var t = pv.Transform.identity;
    
    if(this instanceof pv.Panel) {
        t = t.translate(this.left(), this.top())
             .times(this.transform());
    }

    var parent = this.parent; // TODO : this.properties.transform ? this : this.parent
    if(parent){
        do {
            t = t.translate(parent.left(), parent.top())
                 .times(parent.transform());
        } while((parent = parent.parent));
    }
    
    return t;
};

pv.Mark.prototype.transition = function() {
  return new pv.Transition(this);
};

pv.Mark.prototype.on = function(state) {
  return this["$" + state] = new pv.Transient(this);
};

// --------------

// inset - percentage of width/height to discount on the shape, on each side
pv.Mark.prototype.getShape = function(scenes, index, inset){
    var s = scenes[index];
    if(!s.visible){
        return null;
    }
    if(inset == null){
        inset = 0;
    }
    
    var key = '_shape_inset_' + inset;
    return s[key] || (s[key] = this.getShapeCore(scenes, index, inset));
};

pv.Mark.prototype.getShapeCore = function(scenes, index, inset){
    var s  = scenes[index];
    var l = s.left;
    var t = s.top;
    var w = s.width;
    var h = s.height;
    if(inset > 0 && inset <= 1){
        var dw = inset * w;
        var dh = inset * h;
        l += dw;
        t += dh;
        w -= dw*2;
        h -= dh*2;
    }
    
    return new pv.Shape.Rect(l, t, w, h);
};
