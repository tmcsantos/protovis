/*!
 * Protovis MSIE/VML addon
 * Copyright (C) 2011 by DataMarket <http://datamarket.com>
 * Dual licensed under the terms of the MIT or GPL Version 2 software licenses.
 * 
 * This software includes code from jQuery, http://jquery.com/
 * jQuery is licensed under the MIT or GPL Version 2 license.
 * 
 * This software includes code from the Protovis, http://mbostock.github.com/protovis/
 * Protovis is licensed under the BSD license.
 * 
 */

// detect SVG support
pv.have_SVG = !!( 
  document.createElementNS && 
  document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' ).createSVGRect 
);

// detect VML support
pv.have_VML = (function (d,a,b) {
  a = d.createElement('div');
  a.innerHTML = '<pvml:shape adj="1" />';
  b = a.firstChild;
  b.style.behavior = 'url(#default#VML)';
  return b ? typeof b.adj === 'object' : true;
})(document);

// MSIE does not support indexOf on arrays
if ( !Array.prototype.indexOf ) {
  Array.prototype.indexOf = function (s, from) {
    var n = this.length >>> 0,
        i = (!isFinite(from) || from < 0) ? 0 : (from > this.length) ? this.length : from;
    for (; i < n; i++) { if ( this[i] === s ) { return i; } }
    return -1;
  };
}

// only run if we need to
if ( !pv.have_SVG && pv.have_VML ){(function(){

if ( typeof Date.now !== 'function' ) {
  Date.now = function () { return new Date() * 1; };
}

var vml = {

  round: function(n){ return Math.round( (n || 0) * 21.6 ); },
  styles: null,

  pre: '<pvml:',
  post: ' class="msvml">',

  block: { 'group':1, 'shape':1, 'shapetype':1, 'line':1,
           'polyline':1, 'curve':1, 'rect':1, 'roundrect':1,
           'oval':1, 'arc':1, 'image':1 },
  ends: { 'butt':'flat','round':'round','square':'square','flat':'flat'},
  joins: { 'bevel':'bevel','round':'round','miter':'miter'},
  cursorstyles: {
    'hand': 'pointer',
    'crosshair': 1, 'pointer': 1, 'move': 1, 'text': 1,
    'wait': 1, 'help': 1, 'progress': 1,
    'n-resize': 1, 'ne-resize': 1, 'nw-resize': 1, 's-resize': 1,
    'se-resize': 1, 'sw-resize': 1, 'e-resize': 1, 'w-resize': 1
  },

  text_shim: null,
  _textcache: {},
  text_dims: function ( text, font ) {
    
    if ( !vml.text_shim ) { vml.init();}
    
    if ( !(font in vml._textcache) ) {
      vml._textcache[ font ] = {};
    }
    if ( text in vml._textcache[ font ] ) {
      return vml._textcache[ font ][ text ];
    }
    var shim = vml.text_shim;
    shim.style.font = font;
    shim.innerText = text;
    return (vml._textcache[ font ][ text ] = {
      fontsize: parseInt( shim.style.fontSize, 10 ),
      height: shim.offsetHeight,
      width: shim.offsetWidth
    });
  },

  d2r: Math.PI * 2 / 360,  // is this used more than once?

  get_dim: function ( attr, target ) {
    var o = target || {};
    // reformat the most common attributes
    o.translate_x = 0;
    o.translate_y = 0;
    if ( attr.transform ) {
      var t = /translate\((-?\d+(?:\.\d+)?(?:e-?\d+)?)(?:,(-?\d+(?:\.\d+)?(?:e-?\d+)?))?\)/.exec( attr.transform ); //support exp
      ///translate\((-?\d+(?:\.\d+)?)(?:,(-?\d+(?:\.\d+)?))?\)/.exec( attr.transform );//support negative translations
      //var t = /translate\((\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?\)/.exec( attr.transform );
      if ( t && t[1] ) { o.translate_x = parseFloat( t[1] ); }
      if ( t && t[2] ) { o.translate_y = parseFloat( t[2] ); }
      var r = /rotate\((\d+\.\d+|\d+)\)/.exec( attr.transform );
      if ( r ) { o.rotation = parseFloat( r[1] ) % 360; }
      // var scale_x = 1, scale_y = 1,
      // var s = /scale\((\d+)(?:,(\d+))?\)/i.exec( value );
      // if ( s && s[1] ) { scale[0] = parseInt( s[1], 10 ); }
      // if ( s && s[2] ) { scale[1] = parseInt( s[2], 10 ); }
    }
    o.x = parseFloat( attr.x||0 );
    o.y = parseFloat( attr.y||0 );
    if ( 'width' in attr ) {
      o.width = parseFloat( attr.width);
    }
    if ( 'height' in attr ) { 
      o.height = parseFloat( attr.height);
    }
    return o;
  },

  elm_defaults: {

    "g": {
      rewrite: 'span',
      attr: function ( attr, style, elm, scenes, i ) {
        var d = vml.get_dim( attr );
        elm.style.cssText = "position:absolute;zoom:1;left:"+
                        (d.translate_x + d.x)+"px;top:"+
                        (d.translate_y + d.y)+"px;";
      }
    },

    "line": {
      rewrite: 'shape',
      attr: function ( attr, style, elm, scenes, i ) {
        var x1 = parseFloat( attr.x1 || 0 ),
            y1 = parseFloat( attr.y1 || 0 ),
            x2 = parseFloat( attr.x2 || 0 ),
            y2 = parseFloat( attr.y2 || 0 ),
            r = vml.round;
        elm.coordorigin = "0,0";
        elm.coordsize = "21600,21600";
        vml.path( elm ).v = 'M '+ r(x1) + ' ' + r(y1) + ' L ' + r(x2) + ' ' + r(y2) + ' E';
        vml.stroke( elm, attr, scenes, i );
      },
      css: "top:0px;left:0px;width:1000px;height:1000px"
    },

    "rect": {
      rewrite: 'shape',
      attr: function ( attr, style, elm, scenes, i ) {
        var d = vml.get_dim( attr ),
            p = vml.path( elm ),
            r = vml.round;
        elm.coordorigin = "0,0";
        elm.coordsize = "21600,21600";
        var x = r(d.translate_x + d.x),
            y = r(d.translate_y + d.y),
            w = r(d.width),
            h = r(d.height);
        p.v = 'M ' + x       + ' ' + y       + 
             ' L ' + (x + w) + ' ' + y       + 
             ' L ' + (x + w) + ' ' + (y + h) + 
             ' L ' + x       + ' ' + (y + h) + 
             ' x';
        vml.stroke( elm, attr, scenes, i );
        vml.fill( elm, attr, scenes, i );
      },
      css: "top:0px;left:0px;width:1000px;height:1000px"
    },

    "path": {
      rewrite: 'shape',
      attr: function ( attr, style, elm, scenes, i ) {
        var d = vml.get_dim( attr ),
            es = elm.style;
        es.left = (d.translate_x + d.x) + "px";
        es.top = (d.translate_y + d.y) + "px";
        elm.coordorigin = "0,0";
        elm.coordsize = "21600,21600";
        vml.path( elm, attr.d );
        vml.fill( elm, attr, scenes, i );
        vml.stroke( elm, attr, scenes, i );
      },
      css: "top:0px;left:0px;width:1000px;height:1000px"
    },

    "circle": {
      /* This version of circles is crisper but seems slower
      rewrite: 'shape',
      attr: function ( attr, style, elm ) {
        var d = vml.get_dim( attr ),
            r = vml.round( parseFloat( attr.r || 0 ) ),
            cx = parseFloat( attr.cx || 0 ),
            cy = parseFloat( attr.cy || 0 ),
            es = elm.style;
        es.left = (d.translate_x + d.x + cx + 0.3) + "px";
        es.top  = (d.translate_y + d.y + cy + 0.3) + "px";
        elm.coordorigin = "0,0";
        elm.coordsize = "21600,21600";
        vml.path( elm ).v = "ar-" + r + ",-" + r + "," + r + "," + r + ",0,0,0,0x";
        vml.fill( elm, attr );
        vml.stroke( elm, attr );
      },
      css: "top:0px;left:0px;width:1000px;height:1000px"
      */
      rewrite: 'oval',
      attr: function ( attr, style, elm, scenes, i ) {
        var d  = vml.get_dim( attr ),
            es = elm.style,
            cx = parseFloat( attr.cx || 0 ) + 0.7,
            cy = parseFloat( attr.cy || 0 ) + 0.7,
            r  = parseFloat( attr.r  || 0 ) + 0.5;
        es.top = ( d.translate_y + cy - r ) + "px";
        es.left = ( d.translate_x + cx - r ) + "px";
        es.width = ( r * 2 ) + "px";
        es.height = ( r * 2 ) + "px";
        vml.fill( elm, attr, scenes, i );
        vml.stroke( elm, attr, scenes, i );
      }
    },

    "text": {
      rewrite: 'shape',
      attr: function ( attr, style, elm, scenes, i ) {
        var d = vml.get_dim( attr ),
            es = elm.style;
//        es.left = (d.translate_x + d.x) + "px";
//        es.top = (d.translate_y + d.y) + "px";
        elm.coordorigin = "0,0";
        elm.coordsize = "21600,21600";
        vml.stroke(elm, attr, scenes, i);
        vml.textpath(elm);
        vml.path(elm);
        vml.skew(elm);
        var oldSceneFillStyle = scenes[i].fillStyle;
        scenes[i].fillStyle = {type: 'solid'};
        vml.fill( elm, attr, scenes, i );
        scenes[i].fillStyle = oldSceneFillStyle;
      },
      css: "position:absolute; filter: ;top:0px;left:0px;width:1px;height:1px"

    },

    "svg": {
      rewrite: 'span',
      css: 'position:relative;overflow:hidden;display:inline-block;~display:block;'
    },

    // this allows reuse of the createElement function for actual VML
    "vml:path": { rewrite: 'path' },
    "vml:stroke": { rewrite: 'stroke' },
    "vml:fill": { rewrite: 'fill' },
    "vml:textpath": { rewrite: 'textpath' },
    "vml:skew": { rewrite: 'skew' }

  },

  // cloning elements is a lot faster than creating them
  _elmcache: {
    'span': document.createElement( 'span' ), 
    'div': document.createElement( 'div' )
  },

  createElement: function ( type, reformat ) {
    var elm,
        cache = vml._elmcache,
        helper = vml.elm_defaults[ type ] || {};
    var tagName = helper.rewrite || type;
    if ( tagName in cache ) {
      elm = cache[ tagName ].cloneNode( false );
    }
    else {
      cache[ tagName ] = document.createElement( vml.pre + tagName + vml.post );
      if ( tagName in vml.block ) {
        cache[ tagName ].className += ' msvml_block';
      }
      elm = cache[ tagName ].cloneNode( false );
    }
    helper.css && (elm.style.cssText = helper.css);
    return elm;
  },

  // hex values lookup table
  _hex: pv.range(0,256).map(function(i){ return pv.Format.pad("0",2,i.toString(16)); }),
  _colorcache: {},
  color: function ( value, rgb ) {
    // TODO: deal with opacity here ?
    if ( !(value in vml._colorcache) && (rgb = /^rgb\((\d+),(\d+),(\d+)\)$/i.exec( value )) ) {
      vml._colorcache[value] = '#' + vml._hex[rgb[1]] + vml._hex[rgb[2]] + vml._hex[rgb[3]];
    }
    return vml._colorcache[ value ] || value;
  },

  fill: function ( elm, attr, scenes, i ) {
    var fill = elm.getElementsByTagName( 'fill' )[0];
    if (!fill) {
      fill = elm.appendChild( vml.createElement( 'vml:fill' ) );
    }
    
    var fillStyle = scenes[i].fillStyle;
    if (!attr.fill || !fillStyle || (fillStyle.type === 'solid' && attr.fill === 'none')) {
      fill.on = false;
    } else {
      fill.on = 'true';
      if(fillStyle.type === 'solid'){
          fill.type  = 'solid';
          fill.color = vml.color(attr.fill);
      } else {    
          var isLinear = fillStyle.type === 'lineargradient';
          fill.method = 'none';
          
          var stops = fillStyle.stops;
          var S = stops.length;
          if(S > 0){
              var stopsText = [];
              for (var i = 0 ; i < S ; i++) {
                  var stop = stops[i];
                  stopsText.push(stop.offset + '% ' + vml.color(stop.color.color)); // color.opacity being ignored
              }
              
              fill.color  = vml.color(stops[0].color.color);
              fill.color2 = vml.color(stops[S - 1].color.color);
              fill.colors = stopsText.join(',');
          }
          
          if(isLinear){
              // Clockwise, Top = 0, Degrees
              fill.type = 'gradient';
              var angle = (-pv.degrees(fillStyle.angle)) % 360;
              fill.angle = angle < 0 ? (angle + 360) : angle; 
          } else {
              fill.type  = 'gradientTitle';
              fill.focus = '100%';
              fill.focussize = '0 0';
              fill.focusposition = '0 0'; // not implemented yet
              fill.angle = 0;
          }
      }
      
      fill.opacity = Math.min(parseFloat( attr['fill-opacity'] || '1' ), 1) || '1';
    }
  },
  
  stroke: function ( elm, attr, scenes, i  ) {
    var stroke = elm.getElementsByTagName('stroke')[0];
    if ( !stroke ) {
      stroke = elm.appendChild( vml.createElement( 'vml:stroke' ) );
    }
    if ( !attr.stroke || attr.stroke === 'none' ) {
      stroke.on = 'false';
      stroke.weight = '0';
    }
    else {
        var strokeWidth = attr['stroke-width'];
        if(strokeWidth == null || strokeWidth === ''){
            strokeWidth = 1;
        } else {
            strokeWidth = +strokeWidth;
        }
        
        if(strokeWidth < 1e-10){
            strokeWidth = 0;
        } else if (strokeWidth < 1){
            strokeWidth = 1;
        }
        
        if(!strokeWidth){
            stroke.on = 'false';
            stroke.weight = '0';
        } else {
            stroke.on = 'true';
            stroke.weight = strokeWidth;
            stroke.color = vml.color( attr.stroke ) || 'black';
            stroke.opacity = Math.min(parseFloat( attr['stroke-opacity'] || '1' ),1) || '1';
            stroke.joinstyle = vml.joins[ attr['stroke-linejoin'] ] || 'miter';
        }
    }
  },

  path: function ( elm, svgpath ) {
    var p = elm.getElementsByTagName( 'path' )[0];
    if ( !p ) {
      p = elm.appendChild( vml.createElement( 'vml:path' ) );
    }
    if ( arguments.length > 1 ) {
      p.v = vml.rewritePath( svgpath );
    }
    return p;
  },

  
  skew: function (elm) {
    var sk = elm.getElementsByTagName('skew')[0];
    if (!sk) 
        sk = elm.appendChild(vml.createElement('vml:skew'));
    sk.on = "false";  
//    sk.offset="0f,0f";
    return sk;  
  },
  
  textpath: function (elm) {
    var tp = elm.getElementsByTagName( 'textpath') [0];
    if (!tp) {
        tp = elm.appendChild(vml.createElement('vml:textpath'));
    }
    
    tp.style['v-text-align']='center';
    tp.style['v-text-kern']='true';
    tp.on = "true";
    return tp;
  },

  init: function () {
    if ( !vml.text_shim ) {
      vml.text_shim = document.getElementById('pv_vml_text_shim') || document.createElement('span');
      vml.text_shim.id = 'protovisvml_text_shim';
      vml.text_shim.style.cssText = "position:absolute;left:-9999em;top:-9999em;padding:0;margin:0;line-height:1;display:inline-block;white-space:nowrap;";
      document.body.appendChild( vml.text_shim );
    }
    if ( !vml.styles ) {
      vml.styles = document.getElementById('protovisvml_styles') || document.createElement("style");
      vml.styles.id = 'protovisvml_styles';
      document.documentElement.firstChild.appendChild( vml.styles );
      vml.styles.styleSheet.addRule( '.msvml', 'behavior:url(#default#VML);' );
      vml.styles.styleSheet.addRule( '.msvml_block', 'position:absolute;top:0;left:0;' );
      try {
        if ( !document.namespaces.pvml ) { document.namespaces.add( 'pvml', 'urn:schemas-microsoft-com:vml'); }
      } catch (e) {
        vml.pre  = '<';
        vml.post = ' class="msvml" xmlns="urn:schemas-microsoft.com:vml">';
      }
    }
  },

  // SVG->VML path conversion - This converts a SVG path to a VML path
  //
  // Things that are missing:
  //  - Multiple sets of coords. 
  //    Some commands (lineto,curveto,..) can take multiple sets of coords.
  //    Because Protovis always supplies the command between arguments, this isn't
  //    implemented, but it would be trivial to complete this.
  // - ARCs need solving
   _pathcache: {},
  rewritePath:function ( p, deb ) {
    var x = 0, y = 0, round = vml.round;

    if ( !p ) { return p; }
    if ( p in vml._pathcache ) { return vml._pathcache[p]; }

    // clean up overly detailed fractions (8.526512829121202e-148) 
    p = p.replace( /(\d*)((\.*\d*)(e ?-?\d*))/g, "$1");

    var bits = p.match( /([MLHVCSQTAZ ][^MLHVCSQTAZ ]*)/gi );
    var np = [], lastcurve = [];
    var oldOp = '';
    for ( var i=0,bl=bits.length; i<bl; i++ ) {
      var itm  = bits[i],
          op   = itm.charAt( 0 ),
          args = itm.substring( 1 ).split( /[,]/ );
      if(op == ' '){
        op = oldOp;
      }
      oldOp = op;
      switch ( op ) {

        case 'M':  // moveto (absolute)
          op = 'm';
          x = round( args[0] );
          y = round( args[1] );
          args = [ x, y ];
          break;
        case 'm':  // moveto (relative)
          op = 'm';
          x += round( args[0] );
          y += round( args[1] );
          args = [ x, y ];
          break;

        case "A": // TODO: arc (absolute):
          // SVG: rx ry x-axis-rotation large-arc-flag sweep-flag x y
          // VML: http://www.w3.org/TR/NOTE-VML
          /*var rx = round( args[0] ), 
              ry = round( args[1] ), 
              xrot = round( args[2] ), 
              lrg = round( args[3] ), 
              sweep = round( args[4] );*/
          op = 'l';
          args = [ (x = round( args[5] )),
                   (y = round( args[6] )) ];
          break;

        case "L": // lineTo (absolute)
          op = 'l';
          args = [ (x = round( args[0] )),
                   (y = round( args[1] )) ];
          break;
        case "l": // lineTo (relative)
          op = 'l';
          args = [ (x = x + round( args[0] )),
                   (y = y + round( args[1] )) ];
          break;

        case "H": // horizontal lineto (absolute)
          op = 'l';
          args = [ (x = round( args[0] )), y ];
          break;
        case "h": // horizontal lineto (relative)
          op = 'l';
          args = [ (x = x + round( args[0] )), y ];
          break;

        case "V": // vertical lineto (absolute)
          op = 'l';
          args = [ x, (y = round( args[0] )) ];
          break;
        case "v": // vertical lineto (relative)
          op = 'l';
          args = [ x, (y = y + round( args[0] )) ];
          break;

        case "C": // curveto (absolute)
          op = 'c';
          lastcurve = args = [
            round(args[0]), round(args[1]),
            round(args[2]), round(args[3]),
            (x = round( args[4] )),
            (y = round( args[5] ))
          ];
          break;
        case "c": // curveto (relative)
          op = 'c';
          lastcurve = args = [
            x + round(args[0]),
            y + round(args[1]),
            x + round(args[2]),
            y + round(args[3]),
            (x = x + round( args[4] )),
            (y = y + round( args[5] ))
          ];
          break;

        case "S": // shorthand/smooth curveto (absolute)
          op = 'c';
          lastcurve = args = [
            lastcurve[4] + (lastcurve[4] - lastcurve[2]),
            lastcurve[5] + (lastcurve[5] - lastcurve[3]),
            round(args[0]),
            round(args[1]),
            (x = round( args[2] )),
            (y = round( args[3] ))
          ];
          break;
        case "s":  // shorthand/smooth curveto (relative)
          op = 'c';
          lastcurve = args = [
            lastcurve[4] + (lastcurve[4] - lastcurve[2]),
            lastcurve[5] + (lastcurve[5] - lastcurve[3]),
            x + round(args[0]),
            y + round(args[1]),
            (x = x + round( args[2] )),
            (y = y + round( args[3] ))
          ];
          break;

        case "Q": // quadratic Bezier curveto (absolute)
          op = 'c';
          var x1 = round( args[0] ),
              y1 = round( args[1] ),
              x2 = round( args[2] ),
              y2 = round( args[3] );
          args = [
            ~~(x + (x1 - x) * 2 / 3),
            ~~(y + (y1 - y) * 2 / 3),
            ~~(x1 + (x2 - x1) / 3),
            ~~(y1 + (y2 - y1) / 3),
            (x = x2),
            (y = y2)
          ];
          break;
        case "q": // TODO: quadratic Bezier (relative)
          op = 'l';
          x += round( args[2] );
          y += round( args[3] );
          args = [ x, y ];
          break;

        // TODO: T/t (Shorthand/smooth quadratic Bezier curveto)

        case "Z":
        case "z":
          op = 'xe';
          args = [];
          break;
        default:
          // unsupported path command
          op = '';
          args = [];
      }
      np.push( op, args.join(',') );
    }
    return ( vml._pathcache[p] = (np.join('') + 'e') );
  }

};

//ext access to vml functions
pv.Vml = vml;

pv.VmlScene = {
  
  // The pre-multipled scale, based on any enclosing transforms.
  scale: 1,

  // The set of supported events.
  events: [
    "mousewheel",
    "mousedown",
    "mouseup",
    "mouseover",
    "mouseout",
    "mousemove",
    "click",
    "dblclick"
  ],

  // implicit values are not used for VML, assigned render faster and we have
  // no desire to keep the DOM clean here - only to make it work!
  implicit: { css: {} },

  copy_functions: function ( obj ) {
    for ( var name in obj ) {
      if ( typeof obj[name] === 'function' && !(name in pv.VmlScene) ) {
        pv.VmlScene[ name ] = obj[ name ];
      }
    }
  }

};

// copy helper methods from SvgScene onto our new Scene
pv.VmlScene.copy_functions( pv.SvgScene );
pv.Scene = pv.VmlScene;
pv.renderer = function() { return 'vml'; };//changed renderer

(function(is64bit){
    // experimental minimum visible, with perceptible color, values
    
    pv.VmlScene.minRuleLineWidth = is64bit ? 1.2 : 1.1;
    pv.VmlScene.minBarWidth      = is64bit ? 2.2 : 1.8;
    pv.VmlScene.minBarHeight     = is64bit ? 2.2 : 1.8;
    pv.VmlScene.minBarLineWidth  = is64bit ? 1.2 : 1.0;
}(window.navigator.cpuClass === 'x64'));

pv.VmlScene.expect = function (e, type, scenes, i, attr, style) {
  style = style || {};
  var helper = vml.elm_defaults[type] || {}, 
      _type = helper.rewrite || type;

  if ( e ) {
    if ( e.tagName.toUpperCase() !== _type.toUpperCase() ) {
      var n = vml.createElement( type );
      e.parentNode.replaceChild( n, e );
      e = n;
    }
  } else {
    e = vml.createElement( type );
  }
  
  if ( 'attr' in helper ) {
    helper.attr( attr, style, e, scenes, i );
  }
  
  if ( attr.cursor in vml.cursorstyles ) {
    var curs = vml.cursorstyles[attr.cursor];
    style.cursor = ( curs === 1 ) ? attr.cursor : curs;
  }
  
  if(style) this.setStyle(e, style);
  
  return e;
};

pv.VmlScene.removeSiblings = function(e) {
  while (e) {
    var n = e.nextSibling;
    e.parentNode.removeChild(e);
    e = n;
  }
};

pv.VmlScene.removeFillStyleDefinitions = function(scenes){
};

pv.VmlScene.addFillStyleDefinition = function(scenes, fill){
};

pv.VmlScene.setAttributes = function(e, attributes){
    // Not supported - exists for svg custom attributes
};

pv.VmlScene.setStyle = function(e, style){
    var eStyle = e.style;
    for (var name in style) {
        var value = style[name];
        if (value == null) 
            eStyle.removeAttribute(name);   // cssText 
        else 
            eStyle[name] = value;
    }
};

pv.VmlScene.append = function(e, scenes, index) {
  // FIXME: hooks the scene onto the element --- this is probably hemorrhaging memory in MSIE
  // it is only ever used by the envent dispatcher so it should probably be stored in a cache
  e.$scene = {scenes:scenes, index:index};
  // attach a title to element
  e = this.title(e, scenes[index]);
  if ( !e.parentNode || e.parentNode.nodeType === 11 ) {  // 11 == documentFragment
    scenes.$g.appendChild( e );
  }
  return e.nextSibling;
};

pv.VmlScene.title = function(e, s) {
  e.title = s.title || "";
  return e;
};

// mostly the same code as pv.SvgScene.panel, but with less MSIE crashing...
pv.VmlScene.panel = function(scenes) {
  var g = scenes.$g, e = g && g.firstChild;
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];

    /* visible */
    if (!s.visible) continue;

    /* svg */
    if (!scenes.parent) {
      var canvas = s.canvas;
      canvas.style.display = "inline-block";
      canvas.style.zoom = 1;
      
      if (g && (g.parentNode !== canvas)) {
        g = canvas.firstChild;
        e = g && g.firstChild;
      }
      
      if(!g) {
        vml.init(); // turn VML on if it isn't already
        
        g = canvas.appendChild( vml.createElement( "svg" ) );
        
        // [DCL] Prevent selecting VML elements when dragging 
        g.onselectstart = function(){ return false; };
        
        var events = this.events;
        var dispatch = this.dispatch;
        for (var j = 0, L = events.length; j < L; j++) {
          g.addEventListener
              ? g.addEventListener(events[j], dispatch, false)
              : g.attachEvent("on" + events[j], dispatch);
        }
        
        e = g.firstChild;
      }
      
      scenes.$g = g;
      
      var w = (s.width + s.left + s.right),
          h = (s.height + s.top + s.bottom);
      
      g.style.width  = w + 'px';
      g.style.height = h + 'px';
      g.style.clip = "rect(0px " + w + "px " + h + "px 0px)";
    }

    /* fill */
    e = this.fill( e, scenes, i );

    /* transform (push) */
    var k = this.scale,
        t = s.transform,
        x = s.left + t.x,
        y = s.top + t.y;
    this.scale *= t.k;

    /* children */
    var children = s.children;
    for (var j = 0, C = children.length ; j < C; j++) {
      var child = children[j];
      
      child.$g = e = this.expect(e, "g", scenes, i, {
          "transform": "translate(" + x + "," + y + ")" + (t.k != 1 ? " scale(" + t.k + ")" : "")
      });
      
      this.updateAll(child);
      var parentNode = e.parentNode;
      if (!parentNode || parentNode.nodeType === 11 ) {
        g.appendChild(e);
        var helper = vml.elm_defaults[ e.svgtype ];
        if ( helper && typeof helper.onappend === 'function' ) {
          helper.onappend( e, scenes[i] );
        }
      }
      
      e = e.nextSibling;
    }

    /* transform (pop) */
    this.scale = k;

    /* stroke */
    e = this.stroke( e, scenes, i );

  }
  return e;
};

// Much of the event rewriting code is copyed and watered down
// from the jQuery library's event hander. We have the luxury
// of knowing that we're on MSIE<9 so we can despense with some
// fixes for other browsers.
(function(){
    
  var returnTrue  = function () { return true;  };
  var returnFalse = function () { return false; };
  var _event_props = ["altKey","attrChange","attrName","bubbles","button",
                      "cancelable","charCode","clientX","clientY","ctrlKey",
                      "currentTarget","data","detail","eventPhase","fromElement",
                      "handler","keyCode","layerX","layerY","metaKey",
                      "newValue","offsetX","offsetY","pageX","pageY","prevValue",
                      "relatedNode","relatedTarget","screenX","screenY",
                      "shiftKey","srcElement","target","toElement","view","wheelDelta","which"];
  var _evPropCount = _event_props.length;
  
  function IEvent ( src ) {
    if ( src && src.type ) {
      this.originalEvent = src;
      this.type = src.type;
      this.isDefaultPrevented = returnFalse;
      if (src.defaultPrevented || src.returnValue === false || src.getPreventDefault && src.getPreventDefault()) {
        this.isDefaultPrevented = returnTrue;
      }
      this.timeStamp = src.timeStamp || Date.now();
    } else {
      this.type = src;
      this.timeStamp = Date.now();
    }
  }
  
  IEvent.prototype = {
    preventDefault: function() {
      this.isDefaultPrevented = returnTrue;
      var e = this.originalEvent;
      if (!e) { 
          return; 
      }
      
      // if preventDefault exists run it on the original event
      if (e.preventDefault){
        e.preventDefault();
        // otherwise set the returnValue property of the original event to false (IE)
      } else {
        e.returnValue = false;
      }
    },
    
    stopPropagation: function() {
      this.isPropagationStopped = returnTrue;

      var e = this.originalEvent;
      if (!e) {
        return;
      }
      
      // if stopPropagation exists run it on the original event
      if(e.stopPropagation) {
        e.stopPropagation();
      }
      
      // otherwise set the cancelBubble property of the original event to true (IE)
      e.cancelBubble = true;
    },
    
    stopImmediatePropagation: function() {
      this.isImmediatePropagationStopped = returnTrue;
      this.stopPropagation();
    },
    isDefaultPrevented: returnFalse,
    isPropagationStopped: returnFalse,
    isImmediatePropagationStopped: returnFalse
  };
  
  var SCROLL_NODE = (document.compatMode && document.compatMode != "BackCompat") ? 'documentElement' : 'body';
  
  vml.fixEvent = function(ev){
    // store a copy of the original event object
    // and "clone" to set read-only properties
    var originalEvent = ev;
    
    ev = new IEvent(originalEvent);
    
    var type = ev.type;
    var isKey = type === 'keypress';
    
    for (var i = _evPropCount ; i ; ) {
      var prop = _event_props[--i];
      ev[prop] = originalEvent[prop];
    }
    
    // Fix target property, if necessary
    var target = ev.target;
    if (!target) {
        target = ev.srcElement || document;
        
        // Target should not be a text node (#504, Safari)
        if (target.nodeType === 3) {
            target = target.parentNode;
        }
        
        ev.target = target; 
    }

    // Add relatedTarget, if necessary
    var fromElem;
    if (!ev.relatedTarget && (fromElem = ev.fromElement)) {
      ev.relatedTarget = (fromElem === target) ? ev.toElement : fromElem;
    }
    
    // Calculate pageX/Y if missing and clientX/Y available
    if(!isKey){
        var clientX;
        if (ev.pageX == null && (clientX = ev.clientX) != null) {
          var scrollNode = document[SCROLL_NODE];
          
          ev.pageX =    clientX + (scrollNode.scrollLeft || 0) - (scrollNode.clientLeft || 0);
          ev.pageY = ev.clientY + (scrollNode.scrollTop  || 0) - (scrollNode.clientTop  || 0);
        }
    }
    
    if (ev.which == null) {
        var charCode, keyCode, btn;
        if(!isKey){
            // Add which for mouse events
            if((btn = ev.button) !== null){
                // Add which for click: 1 === left; 2 === middle; 3 === right
                // Note: button is not normalized, so don't use it
                ev.which = (btn & 1 ? 1 : (btn & 2 ? 3 : (btn & 4 ? 2 : 0 ) ));
            }
        } else {
            // Add which for key events
            if((charCode = ev.charCode) != null){
                ev.which = charCode;
            } else if((keyCode = ev.keyCode) != null){
                ev.which = keyCode;
            }  
        }
    }

    // For mouse/key events, metaKey==false if it's undefined
    ev.metaKey = !!ev.metaKey;

    // Mousewheel delta
    if (type === "mousewheel") {
      ev.wheel = ev.wheelDelta;
    }

    return ev;
  };

})();

// replace the listener with something a little more elaborate
pv.listener = function(f, target) {
  return f.$listener || (f.$listener = function(e) {
    try {
      pv.event = vml.fixEvent( e || window.event );
      return f.call( this, pv.event );
    } catch (e) {
      pv.error(e);
    } finally {
      delete pv.event;
    }
  });
};

pv.listen = function(target, type, listener) {
  listener = pv.listener(listener, target);
  if ( target === window ) {
    target = document.documentElement;
  }
  
  target.addEventListener
      ? target.addEventListener(type, listener, false)
      : target.attachEvent("on" + type, listener);
      
  return listener; 
};

pv.VmlScene.dispatch = pv.listener(function(e){
  var t = e.target.$scene;
  if (t && pv.Mark.dispatch(e.type, t.scenes, t.index, e)){
      e.preventDefault();
  }
});

//
pv.VmlScene.image = function(scenes) {
  var e = scenes.$g.firstChild;
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];

    /* visible */
    if (!s.visible) continue;

    /* fill */
    e = this.fill(e, scenes, i);

    /* image */
    if (s.image) {
      // There is no canvas support in MSIE
    } else {
      e = new Image();
      e.src = s.url;
      var st = e.style;
      st.position = 'absolute';
      st.top = s.top;
      st.left = s.left;
      st.width = s.width;
      st.height = s.height;
      st.cursor = s.cursor;
      st.msInterpolationMode = 'bicubic';
    }
    
    e = this.append(e, scenes, i);

    /* stroke */
    e = this.stroke(e, scenes, i);
  }
  return e;
};

pv.VmlScene.label = function(scenes) {
  var e = scenes.$g.firstChild,
      round = Math.round;
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];

    // visible
    if (!s.visible) continue;
    var fill = s.textStyle;
    if (!fill.opacity || !s.text) continue;

    var attr = {};
    if ( s.cursor ) { attr.cursor = s.cursor; }

    // measure text
    var txt = s.text.replace( /\s+/g, '\xA0' );
    var label = vml.text_dims( txt, s.font );

    var dx = 0, dy = 0;

    if ( s.textBaseline === 'middle' ) {
      if(s.textAngle != 0){
        dy += Math.sin(s.textAngle) * label.width /2;
      }
      else {
        dy -= label.fontsize / 2;
      }
    }
    else if ( s.textBaseline === 'top' ) {
      dy += s.textMargin;
    }
    else if ( s.textBaseline === 'bottom' ) {
      dy -= s.textMargin + label.fontsize;
    }

    if ( s.textAlign === 'center' ) {
     if(s.textAngle != 0){
        dx -= Math.cos(s.textAngle) * label.width / 2 ;
      }
     else {
      dx -= label.width / 2; 
     }
    }
    else if ( s.textAlign === 'right' ) {
      dx -= label.width + s.textMargin; 
    }
    else if ( s.textAlign === 'left' ) {
      dx += s.textMargin; 
    }


    attr.fill = vml.color(fill.color) || "black";
    attr['fill-opacity'] = 0.7;
        
    attr.x = s.left;
    attr.x = s.top;
    
    e = this.expect(e, "text", scenes, i, attr, {    
      'display': 'block',
      'lineHeight': 1,
      'whiteSpace': 'nowrap',
      'zoom': 1,
      'position': 'absolute',
      'cursor': 'default'        
    });
    
    e.getElementsByTagName('path')[0].textpathok = 'True';

    var left = s.left;
    var top = s.top;
    
    e.style.top = top + 'px';
    e.style.left = left + 'px';
    
    e.path = " m0,0 l1,0 e";    
    
    

    var rotation = 180 * s.textAngle / Math.PI;


    if ( rotation ) {
        var r =  - (~~rotation % 360) * vml.d2r,
          ct = Math.cos(r).toFixed( 8 ),
          st = Math.sin(r).toFixed( 8 );
    
        
        var skew = e.getElementsByTagName('skew')[0];
        //Need so set the rotation matrix
        skew.on = 'true';
        skew.matrix= "" + ct + "," + st + "," + -st + "," + ct + ",0,0";
    }
    
    
    var textPath = e.getElementsByTagName('textpath')[0];
    textPath.string = txt;
    textPath.style['v-text-align'] = s.textAlign;    
    
    
    //textpath needs font name in double quotes (?)
    var splittedFont = s.font.split('px ');
    var finalFont = s.font;
    if (splittedFont.length > 1) {
        finalFont = splittedFont[0] + "px \"" + splittedFont[1] + "\"";
    }    
    textPath.style.font = finalFont;

  




/*
    e = this.expect(e, "text", scenes, i, attr, {
      "font": s.font,
      // "text-shadow": s.textShadow,
      "textDecoration": s.textDecoration,
      'top': Math.round( s.top + dy ) + 'px',
      'left': Math.round( s.left + dx ) + 'px',
      'position': 'absolute',
      'display': 'block',
      'lineHeight': 1,
      'whiteSpace': 'nowrap',
      'zoom': 1,
      'cursor': 'default',
      'color': vml.color( fill.color ) || 'black'
    });
    e.innerText = txt;
*/


/*
    // Rotation is broken in serveral different ways:
    // 1. it looks REALLY ugly
    // 2. it is incredibly slow
    // 3. rotated text is offset completely wrong and it takes a ton of math to correct it
    // when text is rotated we need to switch to a VML textpath solution
    var rotation = 180 * s.textAngle / Math.PI;
    if ( rotation ) {
      var r = (~~rotation % 360) * vml.d2r,
          ct = Math.cos(r),
          st = Math.sin(r);
      e.style.filter = ['progid:DXImageTransform.Microsoft.Chroma(color="white") progid:DXImageTransform.Microsoft.Matrix(',
                    'M11=',  ct.toFixed( 8 ), ',',
                    'M12=', -st.toFixed( 8 ), ',',
                    'M21=',  st.toFixed( 8 ), ',',
                    'M22=',  ct.toFixed( 8 ), ',sizingMethod=\'auto expand\')";'].join('');
      e.style.backgroundColor = "white";    
    } else {
      e.style.filter = '';
    }
*/
    e = this.append(e, scenes, i);
  }
  return e;
};
pv.VmlScene.wedge = function(scenes) {
  var e = scenes.$g.firstChild,
      round = vml.round;
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];

    // visible
    if (!s.visible) continue;
    var fill = s.fillStyle, stroke = s.strokeStyle;
    if (!fill.opacity && !stroke.opacity) continue;

    // create element sans path
    e = this.expect(e, "path", scenes, i, {
      "pointer-events": s.events,
      "cursor": s.cursor,
      "transform": "translate(" + s.left + "," + s.top + ")",
      "d": '', // we deal with the path afterwards
      "fill": fill.color,
      "fill-rule": "evenodd",
      "fill-opacity": fill.opacity || null,
      "stroke": stroke.color,
      "stroke-opacity": stroke.opacity || null,
      "stroke-width": stroke.opacity ? s.lineWidth / this.scale : null
    });
    
    // add path
    var p = e.getElementsByTagName( 'path' )[0];
    if ( !p ) {
      p = vml.make( 'path' );
      e.appendChild( p );
    }

    // Arc path from bigfix/protovis
    var r1 = round(s.innerRadius),
        r2 = round(s.outerRadius),
        d;
    if (s.angle >= 2 * Math.PI) {
      if (r1) {
        d = "AE0,0 " + r2 + "," + r2 + " 0 23592960"
          + "AL0,0 " + r1 + "," + r1 + " 0 23592960";
      }
      else {
        d = "AE0,0 " + r2 + "," + r2 + " 0 23592960";
      }
    }
    else {
      var sa = Math.round(s.startAngle / Math.PI * 11796480),
           a = Math.round(s.angle / Math.PI * 11796480);
      if (r1) {
        d = "AE 0,0 " + r2 + "," + r2 + " " + -sa + " " + -a
          + " 0,0 " + r1 + "," + r1 + " " + -(sa + a) + " " + a
          + "X";
      }
      else {
        d = "M0,0"
          + "AE0,0 " + r2 + "," + r2 + " " + -sa + " " + -a
          + "X";
      }
    }
    p.v = d;

    e = this.append(e, scenes, i);

  }
  return e;
};

// end VML override
})();}