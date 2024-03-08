// applet.js

// Import necessary modules
const Applet = imports.ui.applet;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const St = imports.gi.St;

// Paths and URLs needed
const APPLET_PATH = ".local/share/cinnamon/applets/BillionsMindset@Prado";
const ICON_PATH = `${APPLET_PATH}/icon.png`;
const API_URL = "https://api.quotable.io/random";

const Main = imports.ui.main;
const Pango = imports.gi.Pango;
const PangoCairo = imports.gi.PangoCairo;

// Define the applet class
function BillionsMindsetApplet(orientation, panelHeight, instanceId) {
    this._init(orientation, panelHeight, instanceId);
}

// Constant for the menu width
const MENU_WIDTH = 300;

// Methods and properties of the applet
BillionsMindsetApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    // Initialize the applet
    _init: function (orientation, panelHeight, instanceId) {
        // Call the initializer of the parent class
        Applet.IconApplet.prototype._init.call(this, orientation, panelHeight, instanceId);

        // Set the applet icon and tooltip
        this.set_applet_icon_path(ICON_PATH);
        this.set_applet_tooltip("Click to get a quote");

        // Menu manager and menu
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);

        // Set a timer to display quotes every 25 minutes
        this.timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 25 * 60, Lang.bind(this, this.displayMenu));

        // Connect the mouse click event to the corresponding method
        this.connect('button-press-event', Lang.bind(this, this.on_applet_clicked));
    },

    // API URL to get random quotes
    apiUrl: API_URL,

    // Menu width
    menuWidth: MENU_WIDTH,

    // Method to get a random quote from the API
    getRandomQuote: function () {
        try {
            let file = Gio.File.new_for_uri(this.apiUrl);
            let [, contents] = file.load_contents(null);
            let json = JSON.parse(contents);
            let quoteText = `${json.content}`.replace(/(.{1,40}(\s|$))/g, "$1\n").trim();
            return { text: quoteText, author: json.author };
        } catch (error) {
            global.logError("Error fetching quote: " + error);
            return { text: "Failed to fetch quote", author: "" };
        }
    },

    // Method to save the quote to a text file
    saveToFile: function (text) {
        let desktopPath = GLib.get_home_dir();
        let filePath = `${desktopPath}/BillionsMindset.txt`;

        let file = Gio.File.new_for_path(filePath);
        let [outputStream, _] = file.replace(null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

        outputStream.write_all_async(text, -1, GLib.PRIORITY_DEFAULT, null, null, null);
    },

    // Method to copy the quote to the clipboard
    copyToClipboard: function (text) {
        St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, text);
    },

    // Method to display the applet context menu
    displayMenu: function () {
        try {
            // Clear the existing menu
            this.menu.removeAll();

            // Get a random quote
            let { text, author } = this.getRandomQuote();

            // Create menu items with the quote and copy/save options
            let quoteMenuItem = new PopupMenu.PopupMenuItem(text);
            let authorMenuItem = new PopupMenu.PopupMenuItem(author);
            let copyMenuItem = new PopupMenu.PopupMenuItem("❤️️ Copy");
            let saveMenuItem = new PopupMenu.PopupMenuItem("📤 Empty File");

            // Configure menu styles
            let menuStyle = `max-width: ${this.menuWidth}px; overflow-wrap: break-word; padding: 10px; border-radius: 10px;`;

            quoteMenuItem.actor.style = menuStyle + "color: white; background-color: transparent;";
            authorMenuItem.actor.style = menuStyle + "color: blueviolet;";
            copyMenuItem.actor.style = menuStyle + "color: blueviolet;";
            saveMenuItem.actor.style = menuStyle + "color: blueviolet;";

            // Connect activation events to corresponding methods
            copyMenuItem.connect('activate', Lang.bind(this, function () {
                this.copyToClipboard(`${text}\n- ${author}`);
                global.log("Quote copied to clipboard.");
            }));

            saveMenuItem.connect('activate', Lang.bind(this, function () {
                this.saveToFile(`${text}\n- ${author}`);
                global.log("Quote saved to file.");
            }));

            // Add items to the menu
            this.menu.addMenuItem(quoteMenuItem);
            this.menu.addMenuItem(authorMenuItem);
            this.menu.addMenuItem(copyMenuItem);
            this.menu.addMenuItem(saveMenuItem);

            // Add menu to the menu manager and open the menu
            this.menuManager.addMenu(this.menu);
            this.menu.open();
        } catch (error) {
            global.logError("Error displaying menu: " + error);
        }

        // Return true to continue the timer call
        return true;
    },

    // Method called when the applet is clicked
    on_applet_clicked: function () {
        this.displayMenu();
    },
};

// Main function to initialize the applet
function main(metadata, orientation, panelHeight, instanceId) {
    return new BillionsMindsetApplet(orientation, panelHeight, instanceId);
}
