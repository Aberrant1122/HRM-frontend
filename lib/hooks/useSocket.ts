import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { getSocketEndpoint } from '@/lib/socket-endpoint';

export const useSocket = () => {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (user && token) {
      // Initialize socket connection
      socketRef.current = io(getSocketEndpoint(), {
        auth: {
          token,
        },
      });

      // Join user room
      socketRef.current.emit('join', user.id);

      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [user, token]);

  return socketRef.current;
};
