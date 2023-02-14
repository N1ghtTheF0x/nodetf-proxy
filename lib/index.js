"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_net_1 = require("node:net");
const node_dgram_1 = require("node:dgram");
var NProxy;
(function (NProxy) {
    /**
     * Creates a Proxy to `address`:`port` with the protocol `type`
     * @param type Type of Protocol: "tcp", "udp4" or "udp6"
     * @param address Address to real Server
     * @param port Port of real Server
     * @returns Proxy
     */
    function create(type, options) {
        if (type == "tcp")
            return new ProxyTCPServer(options);
        else
            return new ProxyUDPServer(type, options);
    }
    NProxy.create = create;
    /**
     * The Proxy Server for sniffing data
     */
    class Server {
        options;
        /**
         * The default Port of the Proxy Server
         */
        static DEFAULT_PORT = 43434;
        /**
         * The last data from the Client
         */
        clientData;
        /**
         * The last data from the Server
         */
        serverData;
        /**
         * The encoding to use for printing info into the console
         */
        encoding = "hex";
        /**
         * Should the Proxy print every data in a clean way?
         */
        printToConsole = true;
        /**
         * Handle client data with a function
         */
        onClientData;
        /**
         * Handle server data with a function
         */
        onServerData;
        constructor(options) {
            this.options = options;
        }
        /**
         * Prints data from the Server/Client in a pretty way
         */
        printInfo() {
            if (!this.printToConsole)
                return;
            if (this.serverData || this.clientData)
                console.clear();
            if (this.clientData)
                console.info(`[Client] ${this.clientData.length} bytes\n${this.clientData.toString(this.encoding)}`);
            if (this.serverData)
                console.info(`[Server] ${this.serverData.length} bytes\n${this.serverData.toString(this.encoding)}`);
        }
    }
    NProxy.Server = Server;
})(NProxy || (NProxy = {}));
class ProxyUDPServer extends NProxy.Server {
    type;
    #clientInfo;
    #pClient;
    #server;
    constructor(type, options) {
        super(options);
        this.type = type;
        this.#pClient = (0, node_dgram_1.createSocket)(type, (data, rinfo) => {
            this.serverData = data;
            if (this.onServerData)
                this.onServerData(data);
            this.printInfo();
            if (this.#clientInfo)
                this.#server.send(data, this.#clientInfo.port, this.#clientInfo.address);
        });
        this.#server = (0, node_dgram_1.createSocket)(type, (data, rinfo) => {
            this.clientData = data;
            if (this.onClientData)
                this.onClientData(data);
            this.printInfo();
            this.#clientInfo = rinfo;
            this.#pClient.send(data, this.options.port, this.options.address);
        });
        this.#server.on("listening", () => {
            console.info(`[Proxy] Listening for connections...`);
            if (options.broadcast)
                this.#server.setBroadcast(options.broadcast);
        });
    }
    listen() {
        this.#server.bind(NProxy.Server.DEFAULT_PORT);
    }
    isTCP() {
        return false;
    }
    isUDP() {
        return true;
    }
}
class ProxyTCPServer extends NProxy.Server {
    #client;
    #pClient;
    #server;
    constructor(options) {
        super(options);
        this.#server = (0, node_net_1.createServer)((socket) => {
            this.#client = socket;
            this.#clientConnect();
            socket.on("data", (data) => {
                this.clientData = data;
                if (this.onClientData)
                    this.onClientData(data);
                this.printInfo();
                if (this.#pClient)
                    this.#pClient.write(data);
            });
        });
    }
    #clientConnect() {
        const proxyClient = this.#pClient = (0, node_net_1.createConnection)(this.options);
        proxyClient.on("data", (data) => {
            this.serverData = data;
            if (this.onServerData)
                this.onServerData(data);
            this.printInfo();
            if (this.#client)
                this.#client.write(data);
        });
    }
    listen() {
        this.#server.listen(NProxy.Server.DEFAULT_PORT, () => {
            console.info(`[Proxy] Listening for connections...`);
        });
    }
    isTCP() {
        return true;
    }
    isUDP() {
        return false;
    }
}
exports.default = NProxy;
//# sourceMappingURL=index.js.map