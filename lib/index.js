"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_net_1 = require("node:net");
const node_dgram_1 = require("node:dgram");
/*
    real-client -> send data -> proxy-server
    proxy-client -> connect -> real-server
    proxy-server -> give data -> proxy-client
    proxy-client -> send data -> real-server
    real-server -> send data -> proxy-client
    proxy-client -> give data -> proxy-server
    proxy-server -> send data -> real-client
    ...
*/
var NProxy;
(function (NProxy) {
    function create(type, address, port) {
        if (type == "tcp")
            return new ProxyTCPServer(address, port);
        else
            return new ProxyUDPServer(type, address, port);
    }
    NProxy.create = create;
    class Server {
        address;
        port;
        static DEFAULT_PORT = 43434;
        clientData;
        serverData;
        constructor(address, port) {
            this.address = address;
            this.port = port;
        }
        printInfo() {
            if (this.serverData || this.clientData)
                console.clear();
            if (this.clientData)
                console.info(`[Client] ${this.clientData.length} bytes\n${this.clientData.toString("hex")}`);
            if (this.serverData)
                console.info(`[Server] ${this.serverData.length} bytes\n${this.serverData.toString("hex")}`);
        }
    }
    NProxy.Server = Server;
})(NProxy || (NProxy = {}));
class ProxyUDPServer extends NProxy.Server {
    type;
    #clientInfo;
    #pClient;
    #server;
    constructor(type, address, port) {
        super(address, port);
        this.type = type;
        this.#pClient = (0, node_dgram_1.createSocket)(type, (data, rinfo) => {
            this.serverData = data;
            this.printInfo();
            if (this.#clientInfo)
                this.#server.send(data, this.#clientInfo.port, this.#clientInfo.address);
        });
        this.#server = (0, node_dgram_1.createSocket)(type, (data, rinfo) => {
            this.clientData = data;
            this.printInfo();
            this.#clientInfo = rinfo;
            this.#pClient.send(data, this.port, this.address);
        });
        this.#server.on("listening", () => {
            console.info(`[Proxy] Listening for connections...`);
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
    constructor(address, port) {
        super(address, port);
        this.#server = (0, node_net_1.createServer)((socket) => {
            this.#client = socket;
            this.#clientConnect();
            socket.on("data", (data) => {
                this.clientData = data;
                this.printInfo();
                if (this.#pClient)
                    this.#pClient.write(data);
            });
        });
    }
    #clientConnect() {
        const proxyClient = this.#pClient = (0, node_net_1.createConnection)({ host: this.address, port: this.port });
        proxyClient.on("data", (data) => {
            this.serverData = data;
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