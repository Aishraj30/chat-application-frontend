import {io} from 'socket.io-client'

export function connectWS(){
    return io('https://chat-app-backend-qz1z.onrender.com/')
}