/**
 * Written by Tobias Sijtsma
 * GitHub @Tobiaqs
 */
"use strict";

(function () {
	window.cTMIDE = window.cTMIDE || {};

	function Tape (data) {
		// Initial position is set to 0
		this._position = 0;
		this._data = data;
	};

	/**
	 * #moveRight()
	 */
	Tape.prototype.moveLeft = function () {
		this._position --;
	};

	/**
	 * #moveRight()
	 */
	Tape.prototype.moveRight = function () {
		this._position ++;
	};

	/**
	 * #read()
	 * returns: the value on the tape at the current position
	 */
	Tape.prototype.read = function () {
		// Read a value if position is on the tape, otherwise #
		if (this.isPositionOnTape()) {
			return this._data[this._position];
		}
		return "#";
	};

	/**
	 * #write()
	 * param value: the value to write to the current position on the tape
	 */
	Tape.prototype.write = function (value) {
		// Write if the position is on the tape. Otherwise, extend the tape and
		// shift position if necessary
		if (this.isPositionOnTape()) {
			this._data[this._position] = value;
		} else if (value !== "#") {
			if (this._position < 0) {
				for (let i = 0; i < -this._position; i ++) {
					this._data.unshift("#");
				}

				this._position = 0;
				this._data[this._position] = value;
			} else if (this._position >= this._data.length) {
				for (let i = 0; i < this._position - this._data.length + 1; i ++) {
					this._data.push("#");
				}

				this._data[this._position] = value;
			}
		}
	};

	/**
	 * #trim()
	 */
	Tape.prototype.trim = function () {
		while (this._data[0] === "#") {
			this._data.splice(0, 1);
			this._position --;
		}

		while (this._data[this._data.length - 1] === "#") {
			this._data.splice(this._data.length - 1, 1);
		}
	};

	/**
	 * #getData()
	 * returns: the raw underlying array
	 */
	Tape.prototype.getData = function () {
		return this._data;
	};

	/**
	 * #getPosition()
	 * returns: the current position on the tape
	 */
	Tape.prototype.getPosition = function () {
		return this._position;
	};

	Tape.prototype.isPositionOnTape = function () {
		return this._position >= 0 && this._position < this._data.length;
	};

	function cTM () {
	};

	/**
	 * #initialize()
	 * param program: the program in ctm language
	 * param data: the data in an array. elements should be strings
	 * param doNotResetOnErrors: for analytical purposes, don't reset the cTM after parsing errors
	 * returns: array of errors, or undefined
	 */
	cTM.prototype.initialize = function (program, data, doNotResetOnErrors) {
		// Initialize transitions array
		this.transitions = [];

		// States associative array, used to find initial and final states
		let states = {};

		let errors = [];

		// Iterate over program lines
		program.split("\n").forEach((line) => {
			line = line.trim();

			// If the length or the index of "%%" === 0..
			if (line.length === 0 || line.indexOf("%%") === 0) {
				return;
			}

			// Split the program line 
			let split = line.split(" ");

			// Convert the program line into a transition object
			let transition = {
				fromState: split[0],
				toState: split[2],
				input: split[1] ? split[1][0] : undefined,
				output: split[1] ? split[1][2] : undefined,
				direction: split[1] ? split[1][4] : undefined
			};

			if (transition.direction !== "L" && transition.direction !== "R") {
				errors.push("Direction " + transition.direction + " was given, L or R expected.");
			}

			// Add the from state to the state array if it doesn't exist yet
			if (!states[transition.fromState]) {
				states[transition.fromState] = { initial: true, final: true };
			}

			// Add the to state to the state array if it doesn't exist yet
			if (!states[transition.toState]) {
				states[transition.toState] = { initial: true, final: true };
			}

			// If we're not dealing with a transition that doesn't change states..
			if (transition.fromState !== transition.toState) {
				// We know that the from state is not final, because it has a transition
				// to another state
				states[transition.fromState].final = false;

				// We know the to state is not initial, since it has a transition incoming
				states[transition.toState].initial = false;
			}

			// Add transition to the transitions array
			this.transitions.push(transition);
		});

		// Keep initial and final state names in these arrays
		let initialStates = [];
		this.finalStates = [];
		this.states = [];

		for (let state in states) {
			if (states[state].initial) {
				initialStates.push(state);
			}
			if (states[state].final) {
				this.finalStates.push(state);
			}
			this.states.push(state);
		}

		// Sort the states so that this.states[0] represents the alphabetically first state.
		this.states.sort();

		// Set initial and final states
		this.initialState = initialStates[0] || this.states[0];

		// Set the current state to the initial state
		this.state = this.initialState;

		if (!this.initialState) {
			errors.push("No initial state could be determined.");
		}

		this.alphabet = [];

		this.transitions.forEach((transition) => {
			if (this.alphabet.indexOf(transition.input) === -1 && transition.input !== "#") {
				this.alphabet.push(transition.input);
			}
			if (this.alphabet.indexOf(transition.output) === -1 && transition.output !== "#") {
				this.alphabet.push(transition.output);
			}
		});

		// Sort alphabetically
		this.alphabet.sort();

		// Create a Tape using the data
		this.tape = new Tape(data);

		// Report errors
		if (errors.length !== 0) {
			if (!doNotResetOnErrors) {
				this.reset();
			}

			return errors;
		}
	};

	/**
	 * #step()
	 * returns: string describing error if error, otherwise undefined
	 */
	cTM.prototype.step = function () {
		let transition = this.transitions.find((transition) => (transition.fromState === this.state && transition.input === this.tape.read()));

		if (transition) {
			this.tape.write(transition.output);

			if (transition.direction === "L") {
				this.tape.moveLeft();
			} else if (transition.direction === "R") {
				this.tape.moveRight();
			}

			this.previousState = this.state;

			this.state = transition.toState;

			this.tape.trim();
		}
	};

	/**
	 * #isFinished()
	 * returns: cTM in the final state: true. otherwise false
	 */
	cTM.prototype.isFinished = function () {
		let transition = this.transitions.find((transition) => (transition.fromState === this.state && transition.input === this.tape.read()));
		return !transition;
	};

	/**
	 * #reset()
	 */
	cTM.prototype.reset = function () {
		delete this.transitions;
		delete this.alphabet;
		delete this.initialState;
		delete this.finalStates;
		delete this.states;
		delete this.state;
		delete this.previousState;
		delete this.tape;
	};

	let eventListeners = {
		error: [],
		initialized: []
	};

	cTM.prototype._emit = function (eventName, data) {
		eventListeners[eventName].forEach((listener) => listener(data));
	};

	cTM.prototype.on = function (eventName, listener) {
		eventListeners[eventName].push(listener);
	};

	window.cTMIDE.Tape = Tape;
	window.cTMIDE.cTM = cTM;
})();
