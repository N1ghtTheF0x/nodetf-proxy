import NProxy from "./index"

NProxy.Server.DEFAULT_PORT = 19132

const proxy = NProxy.create("udp4",{
    address: "192.168.0.179",
    port: 19132,
    broadcast: true
})

proxy.listen()