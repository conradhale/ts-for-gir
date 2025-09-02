// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2017 Andy Holmes <andrew.g.r.holmes@gmail.com>

import "@girs/gjs";
import "@girs/gjs/ambient";
import "@girs/gio-2.0";
import "@girs/glib-2.0";
import "@girs/gtk-4.0";

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import GObject from "gi://GObject?version=2.0";
import Gtk from "gi://Gtk?version=4.0";
import System from "system";

// Import DI container and services
import { GreeterService, needle } from "./needle.js";

// Define a custom signal interface
interface DiApplicationSignals extends Gtk.Application.SignalSignatures {
	hello: (arg: string) => void;
}

class DiApplication extends Gtk.Application {
	static {
		GObject.registerClass(
			{
				Properties: {
					exampleprop: GObject.ParamSpec.string(
						"exampleprop",
						"ExampleProperty",
						"An example read write property",
						GObject.ParamFlags.READWRITE,
						"a default value",
					),
				},
				Signals: { examplesig: { param_types: [GObject.TYPE_INT] } },
			},
			DiApplication,
		);
	}

	declare $signals: DiApplicationSignals;

	override connect<K extends keyof DiApplicationSignals>(
		signal: K,
		callback: GObject.SignalCallback<this, DiApplicationSignals[K]>,
	): number {
		return super.connect(signal, callback);
	}

	constructor() {
		super({
			applicationId: "org.gnome.gjs.DiNeedleApplication",
			flags: Gio.ApplicationFlags.FLAGS_NONE,
		});
	}

	exampleprop: string = "a default value";

	emitExamplesig(number: number): void {
		this.emit("examplesig", number);
	}

	vfunc_startup() {
		super.vfunc_startup();

		// Register sayHello action with string parameter
		const sayHelloAction = new Gio.SimpleAction({
			name: "sayHello",
			parameterType: new GLib.VariantType("s"),
		});

		sayHelloAction.connect("activate", (_action, param) => {
			const name = param?.deepUnpack()?.toString() ?? "World";

			// Resolve Greeter from DI container and greet
			const greeter = needle.get(GreeterService);
			const greeting = greeter.greet(name);
			log(greeting);
		});

		this.add_action(sayHelloAction);
	}

	vfunc_activate() {
		super.vfunc_activate();

		this.hold();

		// Create application window
		const window = new Gtk.ApplicationWindow({
			application: this,
			title: "Needle DI Example",
			defaultWidth: 300,
			defaultHeight: 200,
		});

		// Create button that triggers the sayHello action
		const button = new Gtk.Button({
			label: "Greet Maya",
			marginTop: 20,
			marginBottom: 20,
			marginStart: 20,
			marginEnd: 20,
		});

		button.connect("clicked", () => {
			this.activate_action("sayHello", new GLib.Variant("s", "Maya"));
		});

		window.set_child(button);

		window.connect("close-request", () => {
			this.quit();
		});

		window.present();
	}
}

// Run the application
const app = new DiApplication();
app.run([System.programInvocationName].concat(ARGV));
