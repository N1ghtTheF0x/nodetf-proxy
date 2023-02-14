import { createConnection, createServer, Socket as TCPSocket } from "node:net"
import { createSocket, SocketType as UDPSocketType, Socket as UDPSocket, RemoteInfo } from "node:dgram"

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

type ProxyMap = {
    "udp4": ProxyUDPServer
    "udp6": ProxyUDPServer
    "tcp": ProxyTCPServer
}
type ProxyOptionMap = {
    "udp4": NProxy.UDPOptions
    "udp6": NProxy.UDPOptions
    "tcp": NProxy.TCPOptions
}

namespace NProxy
{
    /**
     * Base options for the proxy
     */
    export interface Options
    {
        address: string
        port: number
    }
    export interface TCPOptions extends Options
    {

    }
    export interface UDPOptions extends Options
    {
        broadcast?: boolean
    }
    export type DataHandler = (data: Buffer) => void
    /**
     * Creates a Proxy to `address`:`port` with the protocol `type`
     * @param type Type of Protocol: "tcp", "udp4" or "udp6"
     * @param address Address to real Server
     * @param port Port of real Server
     * @returns Proxy
     */
    export function create<T extends Type>(type: T,options: ProxyOptionMap[T]): ProxyMap[T]
    {
        if(type == "tcp") return new ProxyTCPServer(options) as ProxyMap[T]
        else return new ProxyUDPServer(type,options) as ProxyMap[T]
    }
    /**
     * Protocol Type of the Proxy
     */
    export type Type = UDPSocketType | "tcp"
    /**
     * The Proxy Server for sniffing data
     */
    export abstract class Server
    {
        /**
         * The default Port of the Proxy Server
         */
        static DEFAULT_PORT = 43434
        /**
         * The last data from the Client
         */
        clientData?: Buffer
        /**
         * The last data from the Server
         */
        serverData?: Buffer
        /**
         * The encoding to use for printing info into the console
         */
        encoding: BufferEncoding = "hex"
        /**
         * Should the Proxy print every data in a clean way?
         */
        printToConsole: boolean = true
        /**
         * Starts the proxy. Now you can connect to it!
         */
        abstract listen(): void
        /**
         * Is the Proxy for tcp?
         */
        abstract isTCP(): this is ProxyTCPServer
        /**
         * Is the Proxy for udp?
         */
        abstract isUDP(): this is ProxyUDPServer
        /**
         * Handle client data with a function
         */
        onClientData?: DataHandler
        /**
         * Handle server data with a function
         */
        onServerData?: DataHandler
        constructor(readonly options: Options)
        {

        }
        /**
         * Prints data from the Server/Client in a pretty way
         */
        printInfo()
        {
            if(!this.printToConsole) return
            if(this.serverData || this.clientData) console.clear()
            if(this.clientData) console.info(`[Client] ${this.clientData.length} bytes\n${this.clientData.toString(this.encoding)}`)
            if(this.serverData) console.info(`[Server] ${this.serverData.length} bytes\n${this.serverData.toString(this.encoding)}`)
        }
    }
}

class ProxyUDPServer extends NProxy.Server
{
    #clientInfo?: RemoteInfo
    #pClient: UDPSocket 
    #server: UDPSocket
    constructor(readonly type: UDPSocketType,options: NProxy.UDPOptions)
    {
        super(options)
        this.#pClient = createSocket(type,(data,rinfo) =>
        {
            this.serverData = data
            if(this.onServerData) this.onServerData(data)
            this.printInfo()
            if(this.#clientInfo) this.#server.send(data,this.#clientInfo.port,this.#clientInfo.address)
        })
        this.#server = createSocket(type,(data,rinfo) =>
        {
            this.clientData = data
            if(this.onClientData) this.onClientData(data)
            this.printInfo()
            this.#clientInfo = rinfo
            this.#pClient.send(data,this.options.port,this.options.address)
        })
        this.#server.on("listening",() =>
        {
            console.info(`[Proxy] Listening for connections...`)
            if(options.broadcast) this.#server.setBroadcast(options.broadcast)
        })
    }
    listen(): void 
    {
        this.#server.bind(NProxy.Server.DEFAULT_PORT)    
    }
    isTCP(): this is ProxyTCPServer {
        return false
    }
    isUDP(): this is ProxyUDPServer {
        return true
    }
}

class ProxyTCPServer extends NProxy.Server
{
    #client?: TCPSocket
    #pClient?: TCPSocket
    #server
    constructor(options: NProxy.TCPOptions)
    {
        super(options)
        this.#server = createServer((socket) =>
        {
            this.#client = socket
            this.#clientConnect()
            socket.on("data",(data) =>
            {
                this.clientData = data
                if(this.onClientData) this.onClientData(data)
                this.printInfo()
                if(this.#pClient) this.#pClient.write(data)
            })
        })
    }
    #clientConnect()
    {
        const proxyClient = this.#pClient =  createConnection(this.options)
        proxyClient.on("data",(data) =>
        {
            this.serverData = data
            if(this.onServerData) this.onServerData(data)
            this.printInfo()
            if(this.#client) this.#client.write(data)
        })
    }
    listen(): void 
    {
        this.#server.listen(NProxy.Server.DEFAULT_PORT,() =>
        {
            console.info(`[Proxy] Listening for connections...`)
        })
    }
    isTCP(): this is ProxyTCPServer {
        return true
    }
    isUDP(): this is ProxyUDPServer {
        return false
    }
}

export default NProxy