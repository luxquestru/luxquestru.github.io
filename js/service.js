/**
 * Binds listener for specified event for an element.
 * Correctly handles MSIE and FF event models.
 *
 * @param {HTMLElement} element an element to set event for
 * @param {String} eventType event name
 * @param {function} handler event listener
 */
function bindEvent(element, eventType, handler)
{
	if (!element) {
		console.error("No element given in bindEvent");
		return;
	}
	if (element.addEventListener)
	{
		element.addEventListener(eventType, handler, false);
	}
	else if (element.attachEvent)
	{
		element.attachEvent("on" + eventType, handler);
	}
}

/**
 * Unbinds listener for specified event for an element.
 * Correctly handles MSIE and FF event models.
 *
 * @param {HTMLElement} element an element to unset event for
 * @param {String} eventType event name
 * @param {function} handler event listener
 */
function unbindEvent(element, eventType, handler)
{
	if (element.removeEventListener)
	{
		element.removeEventListener(eventType, handler, false);
	}
	else if (element.detachEvent)
	{
		element.detachEvent("on" + eventType, handler);
	}
}

/**
 * Returns routine which can be used for specifying as event
 * listener. Is used for assigning object's methods for
 * events.
 *
 * @param {function} method object's method
 * @param {Object} owner owner for specified method
 * @return {function} anonymous function which calls specified method
 */
function createListenerFunction(method, owner)
{
	return function()
	{
		method.apply(owner, arguments);
	}
}

/**
 * Checks if the specified parameter is an Array instance.
 *
 * @param obj object to check
 * @return {Boolean} <tt>true</tt> if it is an array and <tt>false</tt> otherwise
 */
function isArray(obj) {
	return Object.prototype.toString.call(obj) === '[object Array]';
}

function isHTMLObject(obj, type) {
	return Object.prototype.toString.call(obj) === '[object ' + type + ']';
}

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
	var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

	// The base Class implementation (does nothing)
	this.Class = function(){};

	// Create a new Class that inherits from this class
	Class.extend = function(prop) {
		var _super = this.prototype;

		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		var prototype = new this();
		initializing = false;

		// Copy the properties over onto the new prototype
		for (var name in prop) {
			// Check if we're overwriting an existing function
			prototype[name] = typeof prop[name] == "function" &&
				typeof _super[name] == "function" && fnTest.test(prop[name]) ?
				(function(name, fn){
					return function() {
						var tmp = this._super;

						// Add a new ._super() method that is the same method
						// but on the super-class
						this._super = _super[name];

						// The method only need to be bound temporarily, so we
						// remove it when we're done executing
						var ret = fn.apply(this, arguments);
						this._super = tmp;

						return ret;
					};
				})(name, prop[name]) :
				prop[name];
		}

		// The dummy class constructor
		function Class() {
			// All construction is actually done in the init method
			if ( !initializing && this.init )
				this.init.apply(this, arguments);
		}

		// Populate our constructed prototype object
		Class.prototype = prototype;

		// Enforce the constructor to be what we expect
		Class.prototype.constructor = Class;

		// And make this class extendable
		Class.extend = arguments.callee;

		return Class;
	};
})();

function setCookie(name, value, expires, path, domain, secure) {
	if (!name || !value) return false;
	var str = name + '=' + encodeURIComponent(value);

	if (expires) str += '; expires=' + expires.toGMTString();
	if (path)    str += '; path=' + path;
	if (domain)  str += '; domain=' + domain;
	if (secure)  str += '; secure';

	document.cookie = str;
	return true;
}

function getCookie(name) {
	var pattern = "(?:; )?" + name + "=([^;]*);?";
	var regexp  = new RegExp(pattern);

	if (regexp.test(document.cookie))
		return decodeURIComponent(RegExp["$1"]);

	return false;
}

function deleteCookie(name, path, domain) {
	document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	return true;
}

function fillTemplate(template, values) {
	for(var i in values) {
		template = template.replace('{!' + i + '!}', values[i]);
	}
	return template;
}
