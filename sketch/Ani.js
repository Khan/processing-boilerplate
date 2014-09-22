var Ani = (function () {
	var Ani = function (target, duration /*, ... */) {
		// Ani has this ugly dynamic type-directed polymorphic constructor API.
		this.targetObject = target;
		this.durationEasing = duration;
		this.durationDelay = 0;
		this.easing = Ani.defaultEasing;

		var callback = null;
		var delaySpecified = (typeof(arguments[2]) !== 'string');

		switch (arguments.length) {
			case 4:
				this.fieldName = arguments[2];
				this.end = arguments[3];
				break;
			case 5:
				if (delaySpecified) {
					this.durationDelay = arguments[2];
					this.fieldName = arguments[3];
					this.end = arguments[4];
				} else {
					this.fieldName = arguments[2];
					this.end = arguments[3];
					this.easing = arguments[4];
				}
				break;
			case 6:
				if (delaySpecified) {
					this.durationDelay = arguments[2];
					this.fieldName = arguments[3];
					this.end = arguments[4];
					this.easing = arguments[5];
				} else {
					this.fieldName = arguments[2];
					this.end = arguments[3];
					this.easing = arguments[4];
					callback = arguments[5];
				}
				break;
			case 7:
				this.durationDelay = arguments[2];
				this.fieldName = arguments[3];
				this.end = arguments[4];
				this.easing = arguments[5];
				callback = arguments[6];
				break;
			default:
				throw "Wrong number of arguments!";
		}

		this.papplet = Ani.papplet();

		this.targetName = this.targetObject.toString();
		this.id = this.targetName + "_" + this.fieldName;

		this.beginTime = 0;
		this.durationTotal = this.durationEasing + this.durationDelay;

		this.timeMode = Ani.defaultTimeMode;
		this.playMode = Ani.FORWARD;
		this.playDirection = Ani.FORWARD;
		this.repeatCount = 1;
		this._isRepeating = false;
		this._isDelaying = false;
		this._isPlaying = false;
		this._isEnded = false;
		this.setEasing(this.easing);
		this.setCallback(callback);
		
		this.setBegin();
		if (Ani.defaultAutostartMode === Ani.AUTOSTART) {
			this.start();
		}
	};

	Ani.prototype.setBegin = function (newBeginValue) {
		if (newBeginValue === undefined) {
			this.begin = this.targetObject[this.fieldName];
			this.change = this.end - this.begin;
		} else {
			this.begin = newBeginValue;
		}
	};

	// This whole API approach is crazy non-idiomatic in JS, but I want this to be drop-in compatible with the original Ani, so...
	Ani.prototype.setCallback = function (theCallback) {
		if (theCallback && theCallback.length > 0) {
			// parse the string
			var propertyList = theCallback.split(",");
			for (index in propertyList) {
				var property = propertyList[index];
				p = property.trim().split(":");
				if (p.length === 2) {
					var targetFunction = this.targetObject[p[1]];
					if (targetFunction === undefined) {
						throw "Invalid callback (can't find function): " + property;
					}
					if (p[0] === Ani.ON_START) {
						this.callbackStartMethod = targetFunction;
					} else if (p[0] === Ani.ON_END) {
						this.callbackFinishMethod = targetFunction;
					} else if (p[0] === Ani.ON_DELAY_END) {
						this.callbackDelayMethod = targetFunction;
					} else if (p[0] === Ani.ON_UPDATE) {
						this.callbackUpdateMethod = targetFunction;
					}
				}
			}
		}
	};

	Ani.prototype.dispatchOnStart = function () {
		if (this.callbackStartMethod !== undefined) {
			this.callbackStartMethod(this);
		}
	};

	Ani.prototype.dispatchOnEnd = function () {
		if (this.callbackFinishMethod !== undefined) {
			this.callbackFinishMethod(this);
		}
	};

	Ani.prototype.dispatchOnUpdate = function () {
		if (this.callbackUpdateMethod !== undefined) {
			this.callbackUpdateMethod(this);
		}
	};

	Ani.prototype.dispatchOnDelayEnd = function () {
		if (this.callbackDelayMethod !== undefined) {
			this.callbackDelayMethod(this);
		}
	};

	Ani.prototype.scheduleNextFrame = function () {
		window.requestAnimationFrame(this.update.bind(this));
		this._isRegistered = true;
	};

	Ani.prototype.start = function () {
		if (!this._isRegistered) {
			this.scheduleNextFrame();
			this.repeatNumber = 1;
			this.dispatchOnStart();
		}
		this.seek(0.0);
		this._isPlaying = true;
		this._isEnded = false;
	};

	Ani.prototype.stop = function () {
		this._isDelaying = false;
		this.seek(1.0);
		this._isPlaying = false;
		this._isEnded = true;

		if (this._isRegistered) {
			this._isRegistered = false;
		}

		this.dispatchOnEnd();
	};

	Ani.prototype.update = function(time) {
		time = new Date().getTime();
		this.setTime(this.getTime(time), time);
		
		// delay or easing?
		if (this.time < this.durationDelay) {
			this._isDelaying = true;			
			this.position = this.begin;
		} else {
			if (this._isDelaying) {
				this.setBegin();
				this.position = this.begin;
				this.dispatchOnDelayEnd();
			}
			this._isDelaying = false;	
			if (this.time >= this.durationTotal) {
				if (this._isRepeating) {
					if (this.repeatCount === 1 || this.repeatNumber <= this.repeatCount-1 || this.repeatCount === -1) {
						if (this.playMode === Ani.YOYO) {
							this.reverse();
						}
						this.start();
						this.repeatNumber++;
					} else {
						this._isRepeating = false;
					}
				} else {
					this.stop();
				}
				
			} else {
				this.updatePosition();
			}

			this.updateTargetObjectField();
			this.dispatchOnUpdate();
		}

		this._isRegistered = false;
		if (this._isPlaying) {
			this.scheduleNextFrame();
		}
	};

	Ani.prototype.updatePosition = function () {
		this.position = this.easing.calcEasing(this.time - this.durationDelay, this.begin, this.change, this.durationEasing);
	};

	Ani.prototype.updateTargetObjectField = function () {
		this.targetObject[this.fieldName] = this.position;
	};

	Ani.prototype.getTime = function (systemTimeInMilliseconds) {
		return (this.timeMode === Ani.SECONDS) ? ((systemTimeInMilliseconds - this.beginTime) / 1000) : (systemTimeInMilliseconds / (1000 / 60) - this.beginTime);
	};

	Ani.prototype.setTime = function (newTime, systemTimeInMilliseconds) {
		this.time = newTime;
		this.beginTime = (this.timeMode === Ani.SECONDS) ? (systemTimeInMilliseconds - this.time * 1000)
				: (systemTimeInMilliseconds / (1000 / 60) - this.time);
	};

	Ani.prototype.pause = function () {
		this._isPlaying = false;
		var date = new Date();
		this.pauseTime = this.getTime(date.getTime());
	};

	Ani.prototype.resume = function () {
		if (!this._isRegistered) {
			this.scheduleNextFrame();
		}
		if (!this._isPlaying && !this._isEnded) {
			this._isPlaying = true;
			// remember the pause time, seek to last time
			this.seek(this.pauseTime / this.durationTotal);
		}
	};

	Ani.prototype.seek = function (theValue) {
		// clamp between 0 and 1
		theValue = Math.min(1.0, Math.max(0.0, theValue));
		this.setTime(theValue * this.durationTotal, new Date().getTime());
		this.pauseTime = this.time; // overwrite old pause time
		this._isEnded = false;
		// only use easing function to calc position if time > durationDelay
		if (this.time < this.durationDelay) {			
			//setBegin();
			this.position = this.begin;
		} else {
			this.updatePosition();
		}
		this.updateTargetObjectField();
	};

	Ani.prototype.getSeek = function () {
		return Math.min(1.0, Math.max(0.0, this.time / this.durationTotal));
	};

	Ani.prototype.reverse = function () {
		var beginTemp = this.begin;
		var endTemp = this.end;
	
		this.begin = endTemp;
		this.end = beginTemp;
		this.change = this.end - this.begin;
		
		if (this.playDirection === Ani.FORWARD) {
			this.playDirection = Ani.BACKWARD;
		} else if (this.playDirection === Ani.BACKWARD) {
			this.playDirection = Ani.FORWARD;
		}
	};

	Ani.prototype.getTimeMode = function () { return this.timeMode; };
	Ani.prototype.setTimeMode = function (newTimeMode) { this.timeMode = newTimeMode; };
	Ani.prototype.getEasing = function () { return this.easing; };
	Ani.prototype.setEasing = function (newEasing) { this.easing = newEasing; };
	Ani.prototype.getPlayMode = function () { return this.playMode; };
	Ani.prototype.setPlayMode = function (thePlayMode) {
		var oldPlayDirection = this.playDirection;
		
		if (thePlayMode === Ani.FORWARD) {
			if (oldPlayDirection === Ani.BACKWARD) this.reverse();
			this.playDirection = Ani.FORWARD;
			this.playMode = this.playDirection;
		} else if (thePlayMode === Ani.BACKWARD) {
			if (oldPlayDirection === Ani.FORWARD) this.reverse();
			this.playDirection = Ani.BACKWARD;
			this.playMode = this.playDirection;
		} else if (thePlayMode === Ani.YOYO) {
			this.playMode = Ani.YOYO;
		}
	}

	Ani.prototype.repeat = function (newRepeatCount) {
		if (newRepeatCount === undefined) {
			this._isRepeating = true;
			this.repeatCount = -1;
		} else {
			if (newRepeatCount > 1) {
				this._isRepeating = true;
				this.repeatCount = newRepeatCount;
			} else {
				this._isRepeating = false;
				this.repeatCount = 1;
			}
		}
	};

	Ani.prototype.noRepeat = function () {
		this._isRepeating = false;
		this.repeatCount = 1;
	};

	Ani.prototype.getRepeatCount = function () { return this.repeatCount; };
	Ani.prototype.getRepeatNumber = function () { return this.repeatNumber; };
	Ani.prototype.getDirection = function () { return this.playDirection; };
	Ani.prototype.getPosition = function () { return this.position; };
	Ani.prototype.getBegin = function () { return this.begin; };

	Ani.prototype.setEnd = function (newEnd) { 
		this.end = newEnd;
		this.change = this.end - this.begin;
	};
	Ani.prototype.getEnd = function () { return this.end; };
	Ani.prototype.getDurationTotal = function () { return this.durationTotal; };
	Ani.prototype.getDelay = function () { return this.durationDelay; };
	Ani.prototype.setDelay = function (newDelay) {
		this.durationDelay = newDelay;
		this.durationTotal = this.durationDelay + this.durationEasing;
	};
	Ani.prototype.getDuration = function () { return this.durationEasing; };
	Ani.prototype.setDuration = function (newDuration) {
		this.durationEasing = newDuration;
		this.durationTotal = this.durationDelay + this.durationEasing;
	};
	Ani.prototype.getId = function () { return id; };
	Ani.prototype.isEnded = function () { return this._isEnded; };
	Ani.prototype.isRepeating = function () { return this._isRepeating; };
	Ani.prototype.isDelaying = function () { return this._isDelaying; };
	Ani.prototype.isPlaying = function () { return this._isPlaying; };

	// Shamelessly modified from a sample at http://stackoverflow.com/a/7579956
	(function() {
	    var id_counter = 1;
	    Object.defineProperty(Object.prototype, "__ani_id", {
	        writable: true,
	        enumerable: false
	    });
	    Object.defineProperty(Object.prototype, "aniID", {
	        get: function() {
	            if (this.__uniqueId == undefined)
	                this.__uniqueId = id_counter++;
	            return this.__uniqueId;
	        },
	        enumerable: false
	    });
	}());

	// End of AniCore functions.
	// Ani functions:

	var _arrayFromArgumentsObject = function (args) {
		return Array.prototype.slice.call(args);
	}

	// "from" and "to" are the same except for the "reversed" argument.
	Ani.from = function(target, duration/* crazy dynamic polymorphic nonsense */) {
		return Ani._createAniHelper.apply(this, [true].concat(_arrayFromArgumentsObject(arguments)));
	}

	Ani.to = function(target, duration/* crazy dynamic polymorphic nonsense */) {
		return Ani._createAniHelper.apply(this, [false].concat(_arrayFromArgumentsObject(arguments)));
	}

	Ani._createAniHelper = function (/*crazy dynamic polymorphic nonsense */) {
		arguments = _arrayFromArgumentsObject(arguments);
		var isReversed = arguments.shift();
		var target = arguments[0];
		var duration = arguments[1];
		// From this point, the first argument (which is expected to the be the "isReversed" argument) is removed, and the arugment list now looks like the original call to Ani.from().
		var hasDelayArgument = typeof(arguments[2]) === 'number';
		switch (arguments.length) {
			case 3:
				return Ani.addAnis(isReversed, target, duration, 0, arguments[2], Ani.defaultEasing, Ani.defaultTimeMode, Ani.defaultCallback);
			case 4:
				if (hasDelayArgument) {
					return Ani.addAnis(isReversed, target, duration, arguments[2], arguments[3], Ani.defaultEasing, Ani.defaultTimeMode, Ani.defaultCallback);
				} else {
					if (typeof(arguments[3]) === 'number') {
						return Ani.addAni(isReversed, target, duration, 0, arguments[2], arguments[3], Ani.defaultEasing, Ani.defaultTimeMode, Ani.defaultCallback);
					} else {
						return Ani.addAnis(isReversed, target, duration, 0, arguments[2], arguments[3], Ani.defaultTimeMode, Ani.defaultCallback);
					}
				}
			case 5:
				if (hasDelayArgument) {
					if (typeof(arguments[4]) === 'number') {
						return Ani.addAni(isReversed, target, duration, arguments[2], arguments[3], arguments[4], Ani.defaultEasing, Ani.defaultTimeMode, Ani.defaultCallback);
					} else {
						return Ani.addAnis(isReversed, target, duration, arguments[2], arguments[3], arguments[4], Ani.defaultTimeMode, Ani.defaultCallback);
					}
				} else {
					if (typeof(arguments[3]) === 'number') {
						return Ani.addAni(isReversed, target, duration, 0, arguments[2], arguments[3], arguments[4], Ani.defaultTimeMode, Ani.defaultCallback);
					} else {
						return Ani.addAnis(isReversed, target, duration, 0, arguments[2], arguments[3], Ani.defaultTimeMode, arguments[4]);
					}
				}
			case 6:
				if (hasDelayArgument) {
					if (typeof(arguments[4]) === 'number') {
						return Ani.addAni(isReversed, target, duration, arguments[2], arguments[3], arguments[4], arguments[5], Ani.defaultTimeMode, Ani.defaultCallback);
					} else {
						return Ani.addAnis(isReversed, target, duration, arguments[2], arguments[3], arguments[4], Ani.defaultTimeMode, arguments[5]);
					}
				} else {
					return Ani.addAni(isReversed, target, duration, 0, arguments[2], arguments[3], arguments[4], Ani.defaultTimeMode, arguments[5]);
				}
			case 7:
				return Ani.addAni(isReversed, target, duration, arguments[2], arguments[3], arguments[4], arguments[5], Ani.defaultTimeMode, arguments[6]);
		}
	};

	// create a new Ani instance and add to lookup
	// or overwrite an existing Ani with new parameters
	Ani.addAni = function(theReverse, theTarget, theDuration, theDelay, theFieldName, theEnd, theEasing, theTimeMode, theCallback) {
		Ani.cleanAnis();
		var id = theTarget.aniID + "_" + theFieldName;
		
		// get old Ani and overwrite (this is behavior is ignored if defaultAddMode is set to NO_OVERWRITE
		if (Ani.anisLookup[id] !== undefined && Ani.defaultOverwriteMode === Ani.OVERWRITE) {
			
			var existingAni = Ani.anisLookup[id];
			existingAni.setDuration(theDuration);
			existingAni.setDelay(theDelay);
			existingAni.setEasing(theEasing);
			existingAni.setTimeMode(theTimeMode);
			existingAni.setCallback(theCallback);
			existingAni.setBegin();
			existingAni.setEnd(theEnd);
			existingAni.seek(0.0);
			
			// Ani.to or Ani.from?
			if (theReverse) existingAni.reverse();
			return existingAni;
		}
		// create new Ani
		else {
			var newAni = new Ani(theTarget, theDuration, theDelay, theFieldName, theEnd, theEasing, theCallback);
			if (theReverse) newAni.reverse();
			Ani.anisLookup[id] = newAni;
			return newAni;
		}
	};
	
	// property list style
	// create multiple new Ani instance at the same time and add to lookup
	// or overwrite an existing Ani with new parameters
	Ani.addAnis = function(theReverse, theTarget, theDuration, theDelay, thePropertyList, theEasing, theTimeMode, theCallback) {
		var propertyList = thePropertyList.split(",");
		var tmpAnis = [];
		for (i in propertyList) {
			var p = propertyList[i].trim().split(":");
			if (p.length === 2) {
				var fieldName = p[0];
				var end = parseFloat(p[1]);
				tmpAnis[i] = Ani.addAni(theReverse, theTarget, theDuration, theDelay, fieldName, end, theEasing, theTimeMode, theCallback);
			}
		}
		return tmpAnis;
	};
	
	// remove finished ani form lookup
	// so that there will be no reference to the object and the garbage collector can delete it
	Ani.cleanAnis = function () {
		var keys = Object.keys(Ani.anisLookup);
		for (i in keys) {
			var key = keys[i];
			if (Ani.anisLookup[key].isEnded()) {
				delete Ani.anisLookup[key];
			}
		}	
	};
	
	/**
	 * kills all anis of the lookup table in Ani
	 */
	Ani.killAll = function () {
		var keys = Object.keys(Ani.anisLookup);
		for (i in keys) {
			var key = keys[i];
			if (Ani.anisLookup[key].pause !== undefined) {
				Ani.anisLookup[key].pause();
				delete Ani.anisLookup[key];
			}
		}	
	};

	Ani.autostart = function () { Ani.defaultAutostartMode = Ani.AUTOSTART; };
	Ani.noAutostart = function () { Ani.defaultAutostartMode = Ani.NO_AUTOSTART; };
	Ani.getAutostartMode = function () { return Ani.defaultAutostartMode; };
	Ani.overwrite = function () { Ani.defaultOverwriteMode = Ani.OVERWRITE; };
	Ani.noOverwrite = function () { Ani.defaultOverwriteMode = Ani.NO_OVERWRITE; };
	Ani.getOverwriteMode = function () { return Ani.defaultOverwriteMode; };
	Ani.getDefaultTimeMode = function () { return Ani.defaultTimeMode; };
	Ani.setDefaultTimeMode = function (newDefaultTimeMode) { Ani.defaultTimeMode = newDefaultTimeMode; };
	Ani.getDefaultEasing = function () { return Ani.defaultEasing; };
	Ani.setDefaultEasing = function (newDefaultEasing) { Ani.defaultEasing = newDefaultEasing; };
	
	Ani.size = function () {
		return Object.keys(Ani.anisLookup).length;
	};

	Ani.init = function (thePapplet) {
		Ani._papplet = thePapplet;
		Ani.anisLookup = {}
	};

	Ani.papplet = function () {
		if (Ani._papplet === undefined) {
			throw ANI_DEBUG_PREFIX + " Call Ani.init(this); before using this library!";
		}
		return Ani._papplet;
	}

	// Ani.Easing:
	//============

	// Ani.Easing.Easing:

	var Easing = function () {
		this.easingMode = Ani.OUT;
	};

	Easing.prototype.calcEasing = function (t, b, c, d) {
		switch (this.easingMode) {
		case Ani.IN:
			return this.easeIn(t, b, c, d);
		case Ani.OUT:
		default:
			return this.easeOut(t, b, c, d);
		case Ani.IN_OUT:
			return this.easeInOut(t, b, c, d);
		}
	}

	Easing.prototype.setMode = function (easingMode) { this.easingMode = easingMode; };
	Ani.Easing = {}

	// Ani.Easing.Linear:

	var Linear = function () { };
	Linear.prototype = new Easing;

	Linear.prototype.easeIn = function () { return this.easeNone.apply(this, arguments); };
	Linear.prototype.easeOut = function () { return this.easeNone.apply(this, arguments); };
	Linear.prototype.easeInOut = function () { return this.easeNone.apply(this, arguments); };
	Linear.prototype.easeNone = function (t, b, c, d) {
		return c*t/d + b;
	};
	Ani.Easing.Linear = Linear;

	// Ani.Easing.Back:

	var Back = function (easingMode) { this.setMode(easingMode); };
	Back.prototype = new Easing;

	Back.prototype.easeIn = function (t, b, c, d) {
		var s = 1.70158;
		return c * (t /= d) * t * ((s + 1) * t - s) + b;
	};

	Back.prototype.easeOut = function (t, b, c, d) {
		var s = 1.70158;
		return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
	};

	Back.prototype.easeInOut = function (t, b, c, d) {
		var s = 1.70158;
		if ((t /= d / 2) < 1) {
			return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
		}
		return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
	};
	Ani.Easing.Back = Back;

	// Ani.Easing.Bounce:

	var Bounce = function (easingMode) { this.setMode(easingMode); };
	Bounce.prototype = new Easing;

	Bounce.prototype.easeIn = function (t, b, c, d) {
		return c - this.easeOut(d - t, 0, c, d) + b;
	};

	Bounce.prototype.easeOut = function (t, b, c, d) {
		if ((t /= d) < (1 / 2.75)) {
			return c * (7.5625 * t * t) + b;
		} else if (t < (2 / 2.75)) {
			return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
		} else if (t < (2.5 / 2.75)) {
			return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
		} else {
			return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
		}
	};

	Bounce.prototype.easeInOut = function (t, b, c, d) {
		if (t < d / 2) {
			return this.easeIn(t * 2, 0, c, d) * 0.5 + b;
		} else {
			return this.easeOut(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
		}
	};
	Ani.Easing.Bounce = Bounce;

	// Ani.Easing.Circ:

	var Circ = function (easingMode) { this.setMode(easingMode); };
	Circ.prototype = new Easing;

	Circ.prototype.easeIn = function (t, b, c, d) {
		return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
	};

	Circ.prototype.easeOut = function (t, b, c, d) {
		return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
	};

	Circ.prototype.easeInOut = function (t, b, c, d) {
		if ((t /= d / 2) < 1) {
			return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
		}
		return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
	};
	Ani.Easing.Circ = Circ;

	// Ani.Easing.Cubic:

	var Cubic = function (easingMode) { this.setMode(easingMode); };
	Cubic.prototype = new Easing;

	Cubic.prototype.easeIn = function (t, b, c, d) {
		t /= d;
		return c * t * t * t + b;
	};

	Cubic.prototype.easeOut = function (t, b, c, d) {
		t = t / d - 1;
		return c * (t * t * t + 1) + b;
	};

	Cubic.prototype.easeInOut = function (t, b, c, d) {
		t /= d / 2;
		if (t < 1) {
			return c / 2 * t * t * t + b;
		}
		t -= 2;
		return c / 2 * (t * t * t + 2) + b;
	};
	Ani.Easing.Cubic = Cubic;

	// Ani.Easing.CustomEasing:

	var CustomEasing = function () {
		throw "Not yet implemented! Ask Andy to make this happen.";
	}
	Ani.Easing.CustomEasing = CustomEasing;
	
	// Ani.Easing.Elastic:

	var Elastic = function (easingMode) { this.setMode(easingMode); };
	Elastic.prototype = new Easing;

	Elastic.prototype.easeIn = function (t, b, c, d) {
		if (t == 0) {
			return b;
		}
		t /= d;
		if (t == 1) {
			return b + c;
		}
		var p = d * 0.3;
		var a = c;
		var s = p / 4.0;
		t -= 1;
		return -(a * Math.pow(2, 10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
	};

	Elastic.prototype.easeOut = function (t, b, c, d) {
		if (t == 0) {
			return b;
		}
		t /= d;
		if (t == 1) {
			return b + c;
		}
		var p = d * 0.3;
		var a = c;
		var s = p / 4;
		return (a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b);
	};

	Elastic.prototype.easeInOut = function (t, b, c, d) {
		if (t == 0) {
			return b;
		}
		t /= d / 2;
		if (t == 2) {
			return b + c;
		}
		var p = d * (0.3 * 1.5);
		var a = c;
		var s = p / 4;
		t -= 1;
		if (t < 1) {
			return -0.5 * (a * Math.pow(2, 10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
		}
		return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) * 0.5 + c + b;
	};
	Ani.Easing.Elastic = Elastic;

	// Ani.Easing.Expo:

	var Expo = function (easingMode) { this.setMode(easingMode); };
	Expo.prototype = new Easing;

	Expo.prototype.easeIn = function (t, b, c, d) {
		return (t == 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
	};

	Expo.prototype.easeOut = function (t, b, c, d) {
		return (t == d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
	};

	Expo.prototype.easeInOut = function (t, b, c, d) {
		if (t == 0) {
			return b;
		}
		if (t == d) {
			return b + c;
		}
		t /= d / 2;
		if (t < 1) {
			return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
		}
		t -= 1;
		return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
	};
	Ani.Easing.Expo = Expo;

	// Ani.Easing.Quad:

	var Quad = function (easingMode) { this.setMode(easingMode); };
	Quad.prototype = new Easing;

	Quad.prototype.easeIn = function (t, b, c, d) {
		t /= d;
		return c * t * t + b;
	};

	Quad.prototype.easeOut = function (t, b, c, d) {
		t /= d;
		return -c * t * (t - 2) + b;
	};

	Quad.prototype.easeInOut = function (t, b, c, d) {
		t /= d / 2;
		if (t < 1) {
			return c / 2 * t * t + b; 
		}
		t -= 1;
		return -c / 2 * (t * (t - 2) - 1) + b;
	};
	Ani.Easing.Quad = Quad;


	// Ani.Easing.Quart:

	var Quart = function (easingMode) { this.setMode(easingMode); };
	Quart.prototype = new Easing;

	Quart.prototype.easeIn = function (t, b, c, d) {
		t /= d;
		return c * t * t * t * t + b;
	};

	Quart.prototype.easeOut = function (t, b, c, d) {
		t = t / d - 1;
		return -c * (t * t * t * t - 1) + b;
	};

	Quart.prototype.easeInOut = function (t, b, c, d) {
		t /= d / 2;
		if (t < 1)
			return c / 2 * t * t * t * t + b;
		t -= 2;
		return -c / 2 * (t * t * t * t - 2) + b;
	};
	Ani.Easing.Quart = Quart;

	// Ani.Easing.Quint:

	var Quint = function (easingMode) { this.setMode(easingMode); };
	Quint.prototype = new Easing;

	Quint.prototype.easeIn = function (t, b, c, d) {
		t /= d;
		return c * t * t * t * t * t + b;
	};

	Quint.prototype.easeOut = function (t, b, c, d) {
		t = t / d - 1;
		return c * (t * t * t * t * t + 1) + b;
	};

	Quint.prototype.easeInOut = function (t, b, c, d) {
		t /= d / 2;
		if (t < 1) {
			return c / 2 * t * t * t * t * t + b;
		}
		t -= 2;
		return c / 2 * (t * t * t * t * t + 2) + b;
	};
	Ani.Easing.Quint = Quint;


	// Ani.Easing.Sine:

	var Sine = function (easingMode) { this.setMode(easingMode); };
	Sine.prototype = new Easing;

	Sine.prototype.easeIn = function (t, b, c, d) {
		return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
	};

	Sine.prototype.easeOut = function (t, b, c, d) {
		return c * Math.sin(t / d * (Math.PI / 2)) + b;
	};

	Sine.prototype.easeInOut = function (t, b, c, d) {
		return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
	};
	Ani.Easing.Sine = Sine;


	// AniConstants:
	//==============

    Ani.VERSION = "2.5";

    // timeMode
    Ani.SECONDS = "SECONDS";
    Ani.FRAMES = "FRAMES";

    // callback, keywords for the property list string parsing
    Ani.ON_START = "onStart";
    Ani.ON_END = "onEnd";
    Ani.ON_DELAY_END = "onDelayEnd";
    Ani.ON_UPDATE = "onUpdate";

    // playMode
    Ani.FORWARD = "FORWARD";
    Ani.BACKWARD = "BACKWARD";
    Ani.YOYO = "YOYO";

    // autoStartMode
    Ani.AUTOSTART = "AUTOSTART";
    Ani.NO_AUTOSTART = "NO_AUTOSTART";

    // overwriteMode
    Ani.OVERWRITE = "OVERWRITE";
    Ani.NO_OVERWRITE = "NO_OVERWRITE";

    // debug out
    Ani.ANI_DEBUG_PREFIX = "### Ani Debug -> ";

    // easings mode
    Ani.IN = 0;
    Ani.IN_OUT = 2;
    Ani.OUT = 1;

    // names of easings
    Ani.LINEAR = new Linear();
    Ani.QUAD_IN = new Quad(Ani.IN);
    Ani.QUAD_OUT = new Quad(Ani.OUT);
    Ani.QUAD_IN_OUT = new Quad(Ani.IN_OUT);
    Ani.CUBIC_IN = new Cubic(Ani.IN);
    Ani.CUBIC_OUT = new Cubic(Ani.OUT);
    Ani.CUBIC_IN_OUT = new Cubic(Ani.IN_OUT);
    Ani.QUART_IN = new Quart(Ani.IN);
    Ani.QUART_OUT = new Quart(Ani.OUT);
    Ani.QUART_IN_OUT = new Quart(Ani.IN_OUT);
    Ani.QUINT_IN = new Quint(Ani.IN);
    Ani.QUINT_OUT = new Quint(Ani.OUT);
    Ani.QUINT_IN_OUT = new Quint(Ani.IN_OUT);
    Ani.SINE_IN = new Sine(Ani.IN);
    Ani.SINE_OUT = new Sine(Ani.OUT);
    Ani.SINE_IN_OUT = new Sine(Ani.IN_OUT);
    Ani.CIRC_IN = new Circ(Ani.IN);
    Ani.CIRC_OUT = new Circ(Ani.OUT);
    Ani.CIRC_IN_OUT = new Circ(Ani.IN_OUT);
    Ani.EXPO_IN = new Expo(Ani.IN);
    Ani.EXPO_OUT = new Expo(Ani.OUT);
    Ani.EXPO_IN_OUT = new Expo(Ani.IN_OUT);
    Ani.BACK_IN = new Back(Ani.IN);
    Ani.BACK_OUT = new Back(Ani.OUT);
    Ani.BACK_IN_OUT = new Back(Ani.IN_OUT);
    Ani.BOUNCE_IN = new Bounce(Ani.IN);
    Ani.BOUNCE_OUT = new Bounce(Ani.OUT);
    Ani.BOUNCE_IN_OUT = new Bounce(Ani.IN_OUT);
    Ani.ELASTIC_IN = new Elastic(Ani.IN);
    Ani.ELASTIC_OUT = new Elastic(Ani.OUT);
    Ani.ELASTIC_IN_OUT = new Elastic(Ani.IN_OUT);

	Ani.defaultTimeMode = Ani.SECONDS;
	Ani.defaultEasing = Ani.EXPO_OUT;
	Ani.defaultAutostartMode = Ani.AUTOSTART;
	Ani.defaultCallback = "";
	Ani.defaultOverwriteMode = Ani.OVERWRITE;

    return Ani;
})();

var AniUtil = (function () {
	var AniUtil = function () {};

	AniUtil.shortRotation = function (theAngle1, theAngle2) {
		var twoPi = Math.PI * 2.0;
		var a1 = (theAngle1 % twoPi + twoPi) % twoPi;
		var a2 = (theAngle2 % twoPi + twoPi) % twoPi;

		if (a2 > a1) {
			var d1 = a2 - a1;
			var d2 = a1 + twoPi - a2;
			if (d1 <= d2) {
				return -d1;
			} else {
				return d2;
			}
		} else {
			var d1 = a1 - a2;
			var d2 = a2 + twoPi - a1;
			if (d1 <= d2) {
				return d1;
			} else {
				return -d2;
			}
		}
	}

    return AniUtil;
})();