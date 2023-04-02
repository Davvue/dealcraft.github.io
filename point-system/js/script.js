"use strict";

class PTM {
	#version = "2.0.0-beta.1";
	#options = {
		startBalance: 100,
		storage: localStorage,
		storagePrefix: "ptm-",
		logLevel: 1,
		name: "PTM",
		currencyName: "pt",
		removeUnavailableItems: false,
	};
	#items = [];
	#callback;

	#user = {
		balance: this.#options.startBalance,
		ownedItems: [],
	};

	constructor(items, options, callback) {
		this.#info(true, `Version ${this.#version} of point system`);
		this.#info(true, "Initializing PTM");
		this.#options = { ...this.#options, ...options };
		this.#items = items;
		this.#callback = function () {
			try {
				this.#log("calling callback");
				callback(this.#user, this.#items);
			} catch (e) {
				this.#error(false, e);
			}
		};
		this.#loadUser();
		this.#info(true, "Finished initializing PTM");
		this.#callback();
	}

	hasItem(itemName) {
		this.#log(`checking user items for '${itemName}'`);
		return this.#user.ownedItems.some((item) => item.name === itemName);
	}

	buyItem(itemName) {
		this.#log(`buying item '${itemName}'`);
		if (this.hasItem(itemName))
			return this.#log(`user already has '${itemName}'`);

		const item = this.getItem(itemName);
		if (!item) return;

		if (this.#user.balance + item.price < 0)
			return this.#log(`insufficient balance`);

		this.chargeUser(item.price);
		this.#user.ownedItems.push(item);
		this.#saveUser();
		this.#callback();
		return this;
	}

	getItem(itemName) {
		this.#log(`searching ${itemName}`);
		const item = this.#items.find((item) => item.name === itemName);
		if (!item)
			return this.#warn(false, `item '${itemName}' does not exist`);
		return item;
	}

	chargeUser(amount) {
		this.#log(`charging user ${amount}${this.#options.currencyName}`);
		try {
			amount = Number(amount);
		} catch (e) {
			this.#error(false, e);
		}

		if (amount < 0) {
			this.#log(
				`charged user for ${amount * -1}${this.#options.currencyName}`
			);
		} else {
			this.#log(
				`added ${amount}${this.#options.currencyName} to user balance`
			);
		}
		this.#user.balance += amount;
		this.#saveUser();
		this.#callback();
		return this;
	}

	getBalance() {
		this.#log(`getting balance`);
		return this.#user.balance;
	}

	getUserItems() {
		this.#log(`getting user items`);
		return this.#user.ownedItems;
	}

	#saveUser() {
		this.#log("saving user");
		const base64 = btoa(JSON.stringify(this.#user));
		this.#options.storage.setItem(
			this.#options.storagePrefix + "user",
			base64
		);
		this.#log("saved user");
	}

	#loadUser() {
		this.#log("load user from storage");

		const base64 = this.#options.storage.getItem(
			this.#options.storagePrefix + "user"
		);

		if (base64) {
			this.#log("parsing storage data");
			this.#user = JSON.parse(atob(base64));
			if (this.#options.removeUnavailableItems) {
				this.#log("removing unavailable items");
				this.#user.ownedItems = this.#user.ownedItems.filter((oi) =>
					this.#items.some((item) => item.name === oi.name)
				);
				this.#saveUser();
			}
			this.#log("parsed user from storage ", this.#user);
		} else {
			this.#log("no user found");
			this.#saveUser();
		}
	}

	#generateLogTimestamp(type) {
		const time = new Date();
		let timestamp = `[${this.#options.name} ${type} `;
		timestamp += time.getFullYear() + "-";
		timestamp += String(time.getMonth() + 1).padStart(2, "0") + "-";
		timestamp += String(time.getDate()).padStart(2, "0") + " ";
		timestamp += String(time.getHours()).padStart(2, "0") + ":";
		timestamp += String(time.getMinutes()).padStart(2, "0") + ":";
		timestamp += String(time.getSeconds()).padStart(2, "0") + "] ";
		return timestamp;
	}

	#deprecatedWarning(descriptor) {
		let deprecatedWarning = new Error(
			`${descriptor} is deprecated and will be removed in the future}`
		);
		deprecatedWarning.name = "Deprecated warning";
		return deprecatedWarning;
	}

	#log(...args) {
		let concat = true;
		let output = [];

		if (this.#options.logLevel >= 4) {
			const timestamp = this.#generateLogTimestamp("Log");
			output.push(timestamp);

			for (const arg of args) {
				if (
					concat &&
					(typeof arg === "string" ||
						typeof arg === "number" ||
						typeof arg === "bigint")
				)
					output[0] += arg;
				else output.push(arg);
				concat = false;
			}
			console.log(...output);
		}
	}

	#info(bypassLogLevel = false, ...args) {
		let concat = true;
		let output = [];

		if (this.#options.logLevel >= 3 || bypassLogLevel) {
			const timestamp = this.#generateLogTimestamp("Info");
			output.push(timestamp);

			for (const arg of args) {
				if (
					concat &&
					(typeof arg === "string" ||
						typeof arg === "number" ||
						typeof arg === "bigint")
				)
					output[0] += arg;
				else output.push(arg);
				concat = false;
			}
			console.info(...output);
		}
	}

	#warn(bypassLogLevel = false, ...args) {
		let concat = true;
		let output = [];

		if (this.#options.logLevel >= 2 || bypassLogLevel) {
			const timestamp = this.#generateLogTimestamp("Warn");
			output.push(timestamp);

			for (const arg of args) {
				if (
					concat &&
					(typeof arg === "string" ||
						typeof arg === "number" ||
						typeof arg === "bigint")
				)
					output[0] += arg;
				else output.push(arg);
				concat = false;
			}
			console.warn(...output);
		}
	}

	#error(bypassLogLevel = false, ...args) {
		let concat = true;
		let output = [];

		if (this.#options.logLevel >= 1 || bypassLogLevel) {
			const timestamp = this.#generateLogTimestamp("Error");
			output.push(timestamp);

			for (const arg of args) {
				if (
					concat &&
					(typeof arg === "string" ||
						typeof arg === "number" ||
						typeof arg === "bigint")
				)
					output[0] += arg;
				else output.push(arg);
				concat = false;
			}
			console.error(...output);
		}
	}

	/** Deprecated methods */
	withdraw(amount) {
		this.#warn(true, this.#deprecatedWarning("function withdraw"));
		return this.chargeUser(-amount);
	}

	deposit(amount) {
		this.#warn(true, this.#deprecatedWarning("function dposit"));
		return this.chargeUser(amount);
	}

	buy(itemName) {
		this.#warn(true, this.#deprecatedWarning("function buy"));
		return this.buyItem(itemName);
	}

	userHas(itemName) {
		this.#warn(true, this.#deprecatedWarning("function userHas"));
		return this.hasItem(itemName);
	}

	safeUser() {
		this.#error(
			true,
			`function safeUser is deprecated and therefore not available anymore`
		);
	}

	refreshPTMs() {
		this.#error(
			true,
			`function refreshPTMs is deprecated and therefore not available anymore`
		);
	}
}
