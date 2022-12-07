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

namespace NProxy
{
    export function create(type: Type,address: string,port: number): Server
    {
        if(type == "tcp") return new ProxyTCPServer(address,port)
        else return new ProxyUDPServer(type,address,port)
    }
    export type Type = UDPSocketType | "tcp"
    export abstract class Server
    {
        static DEFAULT_PORT = 43434
        clientData?: Buffer
        serverData?: Buffer
        abstract listen(): void
        abstract isTCP(): this is ProxyTCPServer
        abstract isUDP(): this is ProxyUDPServer
        constructor(readonly address: string,readonly port: number)
        {

        }
        printInfo()
        {
            if(this.serverData || this.clientData) console.clear()
            if(this.clientData) console.info(`[Client] ${this.clientData.length} bytes\n${this.clientData.toString("hex")}`)
            if(this.serverData) console.info(`[Server] ${this.serverData.length} bytes\n${this.serverData.toString("hex")}`)
        }
    }
}

class ProxyUDPServer extends NProxy.Server
{
    #clientInfo?: RemoteInfo
    #pClient: UDPSocket 
    #server: UDPSocket
    constructor(readonly type: UDPSocketType,address: string,port: number)
    {
        super(address,port)
        this.#pClient = createSocket(type,(data,rinfo) =>
        {
            this.serverData = data
            this.printInfo()
            if(this.#clientInfo) this.#server.send(data,this.#clientInfo.port,this.#clientInfo.address)
        })
        this.#server = createSocket(type,(data,rinfo) =>
        {
            this.clientData = data
            this.printInfo()
            this.#clientInfo = rinfo
            this.#pClient.send(data,this.port,this.address)
        })
        this.#server.on("listening",() =>
        {
            console.info(`[Proxy] Listening for connections...`)
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
    constructor(address: string,port: number)
    {
        super(address,port)
        this.#server = createServer((socket) =>
        {
            this.#client = socket
            this.#clientConnect()
            socket.on("data",(data) =>
            {
                this.clientData = data
                this.printInfo()
                if(this.#pClient) this.#pClient.write(data)
            })
        })
    }
    #clientConnect()
    {
        const proxyClient = this.#pClient =  createConnection({host: this.address,port: this.port})
        proxyClient.on("data",(data) =>
        {
            this.serverData = data
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