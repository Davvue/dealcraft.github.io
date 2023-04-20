"use strict";

class PTM {
	#version = "2.3.1";
	#options = {
		startBalance: 100,
		storage: localStorage,
		storagePrefix: "ptm-",
		logLevel: 2,
		name: "PTM",
		currencyName: "pt",
		removeUnavailableItems: false,
		removeInvalidItems: true,
		loggingTo: console,
		itemIdentifierField: "id",
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
			if (callback) {
				try {
					this.#log("calling callback");
					const mappedItems = this.#items.map((item) => {
						return {
							...item,
							isValid: this.#isItemValid(item),
						};
					});

					const mappedUser = {
						...this.#user,
						ownedItems: this.#user.ownedItems.map((item) => {
							return {
								...item,
								isValid: this.#isItemValid(item),
							};
						}),
					};

					callback(mappedUser, mappedItems, this);
				} catch (e) {
					this.#error(false, e);
				}
			}
		};
		this.#loadUser();
		this.#info(true, "Finished initializing PTM");
		this.#callback();
	}

	hasItem(itemIdentifier) {
		this.#log(`checking user items for '${itemIdentifier}'`);
		return this.#user.ownedItems.some(
			(item) => item[this.#options.itemIdentifierField] === itemIdentifier
		);
	}

	buyItem(itemIdentifier) {
		this.#log(`buying item '${itemIdentifier}'`);

		if (this.hasItem(itemIdentifier))
			return this.#warn(false, `user already has '${itemIdentifier}'`);

		const item = this.getItem(itemIdentifier);

		if (!this.#isItemValid(item))
			return this.#warn(
				false,
				`attempting to buy invalid item '${itemIdentifier}'`
			);
		if (!item) return;

		if (this.#user.balance + item.price < 0)
			return this.#warn(false, `insufficient balance`);

		this.chargeUser(item.price);
		this.#user.ownedItems.push(item);
		this.#saveUser();
		this.#callback();
		return this;
	}

	sellItem(itemIdentifier) {
		this.#log(`selling item '${itemIdentifier}'`);

		const item = this.getItem(itemIdentifier);
		if (!item) return;

		if (!this.hasItem(itemIdentifier))
			this.#warn(false, `user does not own item '${itemIdentifier}'`);

		this.chargeUser(-item.price);

		const itemIndex = this.#user.ownedItems.findIndex(
			(item) => item[this.#options.itemIdentifierField] === itemIdentifier
		);
		if (!itemIndex < 0)
			return this.#error(
				false,
				"an unexpected error occurred. Please report this error at https://github.com/Dealcraft/Points-system/issues"
			);

		this.#user.ownedItems.splice(itemIndex, 1);
		this.#saveUser();
		this.#callback();
		return this;
	}

	getItem(itemIdentifier) {
		this.#log(`searching '${itemIdentifier}'`);
		const item =
			this.#items.find(
				(item) =>
					item[this.#options.itemIdentifierField] === itemIdentifier
			) ||
			this.#user.ownedItems.find(
				(item) =>
					item[this.#options.itemIdentifierField] === itemIdentifier
			);
		if (!item)
			return this.#warn(false, `item '${itemIdentifier}' does not exist`);

		item.isValid = this.#isItemValid(item);
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

	get balance() {
		this.#log(`getting balance`);
		return this.#user.balance;
	}

	get userItems() {
		this.#log(`getting user items`);
		return this.#user.ownedItems.map((item) => {
			return {
				...item,
				isValid: this.#isItemValid(item),
			};
		});
	}

	get items() {
		this.#log("getting items");
		return this.#items.map((item) => {
			return {
				...item,
				isValid: this.#isItemValid(item),
			};
		});
	}

	get user() {
		this.#log("getting user");
		return this.#user;
	}

	get VERSION() {
		this.#log("getting version");
		return this.#version;
	}

	set items(items) {
		this.#log(`updating items`);
		if (Array.isArray(items)) return this.#error("Items must be an array");
		this.#items = items;
	}

	set options(options) {
		this.#log("updating options");
		if (typeof options !== "object")
			return this.#error("Options must be an object");
		this.#options = { ...this.#options, ...options };
	}

	set callback(callback) {
		this.#log("updating callback");
		if (typeof callback !== "function")
			return this.#error("Callback must be a function");
		this.#callback = function () {
			if (callback) {
				try {
					this.#log("calling callback");

					const mappedItems = this.#items.map((item) => {
						return {
							...item,
							isValid: this.#isItemValid(item),
						};
					});

					const mappedUser = {
						...this.#user,
						ownedItems: this.#user.ownedItems.map((item) => {
							return {
								...item,
								isValid: this.#isItemValid(item),
							};
						}),
					};

					callback(mappedUser, mappedItems, this);
				} catch (e) {
					this.#error(false, e);
				}
			}
		};
	}

	#isItemValid(item) {
		this.#log(
			`checking validity for item '${
				item[this.#options.itemIdentifierField]
			}'`
		);

		if (!item.validUntil && !item.validFrom) return true;

		const now = new Date();

		if (item.validUntil) {
			const validUntil = new Date(item.validUntil);
			if (now.valueOf() - validUntil.valueOf() >= 0) return false;
		}

		if (item.validFrom) {
			const validFrom = new Date(item.validFrom);
			if (now.valueOf() - validFrom.valueOf() < 0) return false;
		}

		return true;
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
					this.#items.some(
						(item) =>
							item[this.#options.itemIdentifierField] ===
							oi[this.#options.itemIdentifierField]
					)
				);
				this.#saveUser();
			}

			if (this.#options.removeInvalidItems) {
				this.#log("removing invalid items");
				this.#user.ownedItems = this.#user.ownedItems.filter((oi) => {
					const item = this.getItem(
						oi[this.#options.itemIdentifierField]
					);
					return this.#isItemValid(item);
				});
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

	#deprecatedWarning(descriptor, useInstead) {
		let deprecatedWarning = new Error(
			`${descriptor} is deprecated and will be removed in the future. Use PTM.prototype.${useInstead} instead`
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
			this.#options.loggingTo.log(...output);
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
			this.#options.loggingTo.info(...output);
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
			this.#options.loggingTo.warn(...output);
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
			this.#options.loggingTo.error(...output);
		}
	}

	/** Deprecated methods */
	withdraw(amount) {
		this.#warn(
			true,
			this.#deprecatedWarning(
				"function withdraw",
				`chargeUser(${-amount})`
			)
		);
		return this.chargeUser(-amount);
	}

	deposit(amount) {
		this.#warn(
			true,
			this.#deprecatedWarning("function dposit", `chargeUser(${amount})`)
		);
		return this.chargeUser(amount);
	}

	buy(itemName) {
		this.#warn(
			true,
			this.#deprecatedWarning("function buy", `buyItem(${itemName})`)
		);
		return this.buyItem(itemName);
	}

	userHas(itemName) {
		this.#warn(
			true,
			this.#deprecatedWarning("function userHas", `hasItem(${itemName})`)
		);
		return this.hasItem(itemName);
	}

	getUserItems() {
		this.#warn(
			true,
			this.#deprecatedWarning("function getUserItems", "userItems")
		);
		return this.userItems;
	}

	getBalance() {
		this.#warn(
			true,
			this.#deprecatedWarning("function getBalance", "balance")
		);
		return this.balance;
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
