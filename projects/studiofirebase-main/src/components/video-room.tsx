"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, addDoc, deleteDoc, getDoc, getDocs, onSnapshot, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { buildIceServers, isRoomExpired, VIDEO_ROOM_TTL_MS } from '@/lib/video-room-utils';

type VideoRoomProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerUid?: string;
};

const VISITOR_UID = 'visitante';

export default function VideoRoom({ open, onOpenChange, peerUid }: VideoRoomProps) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const [callId, setCallId] = useState('');
  const [status, setStatus] = useState('');

  const servers = useMemo(() => buildIceServers(), []);

  const resetSubscriptions = useCallback(() => {
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];
  }, []);

  const setupPeerConnection = useCallback(() => {
    pc.current?.close();
    pc.current = new RTCPeerConnection(servers);

    pc.current.onconnectionstatechange = () => {
      if (!pc.current) return;
      if (pc.current.connectionState === 'failed' || pc.current.connectionState === 'disconnected') {
        pc.current.restartIce();
      }
    };

    pc.current.ontrack = (event) => {
      if (remoteRef.current) {
        remoteRef.current.srcObject = event.streams[0];
      }
    };
  }, [servers]);

  const stopMedia = useCallback(() => {
    [localRef.current, remoteRef.current].forEach((video) => {
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    });
  }, []);

  const endCall = useCallback(async () => {
    if (callId) {
      const callDoc = doc(db, 'calls', callId);
      const [offerCandidates, answerCandidates] = await Promise.all([
        getDocs(collection(callDoc, 'offerCandidates')),
        getDocs(collection(callDoc, 'answerCandidates')),
      ]);

      await Promise.all([
        ...offerCandidates.docs.map((candidateDoc) => deleteDoc(candidateDoc.ref)),
        ...answerCandidates.docs.map((candidateDoc) => deleteDoc(candidateDoc.ref)),
      ]);

      await deleteDoc(callDoc).catch((error) => {
        console.warn('[VideoRoom] Falha ao deletar sala na limpeza:', error);
      });
    }

    resetSubscriptions();
    stopMedia();
    setupPeerConnection();
    setCallId('');
    setStatus('Chamada encerrada.');
  }, [callId, resetSubscriptions, setupPeerConnection, stopMedia]);

  useEffect(() => {
    setupPeerConnection();
    return () => {
      resetSubscriptions();
      stopMedia();
      pc.current?.close();
    };
  }, [resetSubscriptions, setupPeerConnection, stopMedia]);

  const startCamera = async () => {
    if (!pc.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localRef.current) localRef.current.srcObject = stream;
    stream.getTracks().forEach((track) => pc.current?.addTrack(track, stream));
    setStatus('Câmera iniciada.');
  };

  const createRoom = async () => {
    if (!pc.current) return;
    const uid = auth.currentUser?.uid;

    if (!uid || !peerUid || peerUid === VISITOR_UID) {
      setStatus('Não foi possível validar o UID do participante.');
      return;
    }

    const callDoc = doc(collection(db, 'calls'));
    await setDoc(callDoc, {
      participants: [uid, peerUid],
      status: 'active',
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + VIDEO_ROOM_TTL_MS)),
    });

    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    await updateDoc(callDoc, { offer });

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        void addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    resetSubscriptions();
    unsubscribersRef.current.push(
      onSnapshot(callDoc, async (snapshot) => {
        const data = snapshot.data();
        if (!data) return;
        if (isRoomExpired(data.expiresAt)) {
          await endCall();
          return;
        }
        if (data.answer && !pc.current?.currentRemoteDescription) {
          await pc.current?.setRemoteDescription(data.answer);
          setStatus('Participante conectado.');
        }
      }),
      onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            void pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch((error) => {
              console.warn('[VideoRoom] Falha ao adicionar ICE candidate (answer):', error);
            });
          }
        });
      })
    );

    setCallId(callDoc.id);
    setStatus('Sala criada.');
  };

  const joinRoom = async () => {
    if (!pc.current || !callId) return;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setStatus('Usuário não autenticado.');
      return;
    }

    const callDoc = doc(db, 'calls', callId);
    const callData = (await getDoc(callDoc)).data();
    if (!callData) {
      setStatus('Sala não encontrada.');
      return;
    }

    if (!Array.isArray(callData.participants) || !callData.participants.includes(uid)) {
      setStatus('Sem permissão para entrar na sala.');
      return;
    }

    if (isRoomExpired(callData.expiresAt)) {
      await deleteDoc(callDoc).catch((error) => {
        console.warn('[VideoRoom] Falha ao deletar sala expirada:', error);
      });
      setStatus('Sala expirada.');
      return;
    }

    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    await pc.current.setRemoteDescription(callData.offer);
    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);
    await updateDoc(callDoc, { answer });

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        void addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    resetSubscriptions();
    unsubscribersRef.current.push(
      onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            void pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch((error) => {
              console.warn('[VideoRoom] Falha ao adicionar ICE candidate (offer):', error);
            });
          }
        });
      })
    );

    setStatus('Conectado à sala.');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void endCall();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Videochamada</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <video ref={localRef} autoPlay playsInline muted className="w-full rounded-md bg-black aspect-video" />
            <video ref={remoteRef} autoPlay playsInline className="w-full rounded-md bg-black aspect-video" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void startCamera()}>Abrir Câmera</Button>
            <Button type="button" onClick={() => void createRoom()} disabled={!peerUid || peerUid === VISITOR_UID}>Criar Sala</Button>
            <Button type="button" variant="outline" onClick={() => void joinRoom()} disabled={!callId}>Entrar</Button>
            <Button type="button" variant="destructive" onClick={() => void endCall()}>Encerrar</Button>
          </div>
          <Input
            placeholder="ID da sala"
            value={callId}
            onChange={(event) => setCallId(event.target.value)}
          />
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
