

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SocketContext = createContext(null);

export function useSocket() {
    return useContext(SocketContext);
}

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth(); // AuthContext provides user with organizationId

    useEffect(() => {
        // Only connect if user is authenticated
        if (!user) {
            if (socket) {
                console.log('🔌 Disconnecting socket (no user)');
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        // Connect to backend (port 3000)
        // TODO: Use environment variable for URL
        const SOCKET_URL = 'http://localhost:3000';

        console.log(`🔌 Connecting to socket server at ${SOCKET_URL}...`);
        const newSocket = io(SOCKET_URL);

        newSocket.on('connect', () => {
            console.log('✅ Connected to socket server:', newSocket.id);

            // Authenticate with user details
            if (user.uid && user.organizationId) {
                newSocket.emit('authenticate', {
                    userId: user.uid,
                    organizationId: user.organizationId
                });
                console.log(`👤 Authenticated socket for user ${user.uid} in org ${user.organizationId}`);
            } else {
                console.warn('⚠️ User details missing for socket authentication', user);
            }
        });

        // ========================================
        // GLOBAL LISTENERS (Toasts)
        // ========================================

        // Attendance Updates
        newSocket.on('attendance:update', (data) => {
            console.log('📨 Attendance update:', data);
            // Only show toast if it's someone else (optional, or always show)
            if (data.userId !== user.uid) {
                toast.info(`Attendance: ${data.userName} ${data.action} at ${data.time}`);
            }
        });

        // Leave Created
        newSocket.on('leave:created', (data) => {
            console.log('📨 Leave created:', data);
            toast.info(`New Leave Request: ${data.userName} applied for ${data.type}`);
        });

        // Leave Approved
        newSocket.on('leave:approved', (data) => {
            console.log('📨 Leave approved:', data);
            toast.success(`Your leave request was APPROVED by ${data.reviewerName}`);
        });

        // Leave Rejected
        newSocket.on('leave:rejected', (data) => {
            console.log('📨 Leave rejected:', data);
            toast.error(`Your leave request was REJECTED by ${data.reviewerName}`);
        });

        setSocket(newSocket);

        // Cleanup on unmount or user change
        return () => {
            console.log('🔌 Cleaning up socket connection');
            newSocket.disconnect();
        };
    }, [user]); // Re-run if user changes (login/logout)

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
