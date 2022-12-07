import NProxy from "./index"

const proxy = NProxy.create("udp4","localhost",5029)

proxy.listen()