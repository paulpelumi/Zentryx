import { useState, useEffect, useRef } from "react";
import { Send, Plus, ImageIcon, Mic, MicOff, Users, Lock, Video, Hash, MoreVertical, Paperclip, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL;

function useApi() {
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("rd_token")}` });
  const get = (path: string) => fetch(`${BASE}api${path}`, { headers: headers() }).then(r => r.json());
  const post = (path: string, body: any) => fetch(`${BASE}api${path}`, {
    method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).then(r => r.json());
  const postForm = (path: string, data: FormData) => fetch(`${BASE}api${path}`, { method: "POST", headers: headers(), body: data }).then(r => r.json());
  return { get, post, postForm };
}

export default function ChatRoom() {
  const api = useApi();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserId = (() => {
    try { return JSON.parse(atob(localStorage.getItem("rd_token")?.split(".")[1] || "")).userId; } catch { return null; }
  })();

  useEffect(() => {
    Promise.all([api.get("/chat/rooms"), api.get("/chat/users")]).then(([r, u]) => {
      setRooms(r);
      setUsers(u);
      if (r.length > 0) selectRoom(r[0]);
      else setLoading(false);
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const selectRoom = (room: any) => {
    setActiveRoom(room);
    setMessages([]);
    if (pollRef.current) clearInterval(pollRef.current);
    loadMessages(room.id);
    pollRef.current = setInterval(() => loadMessages(room.id), 3000);
    setLoading(false);
  };

  const loadMessages = (roomId: number) => {
    api.get(`/chat/rooms/${roomId}/messages?limit=100`).then(msgs => {
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeRoom) return;
    setSending(true);
    try {
      const msg = await api.post(`/chat/rooms/${activeRoom.id}/messages`, { content: newMsg, messageType: "text" });
      setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
      setNewMsg("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally { setSending(false); }
  };

  const uploadFile = async (file: File, messageType: string) => {
    if (!activeRoom) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("messageType", messageType);
    try {
      const msg = await api.postForm(`/chat/rooms/${activeRoom.id}/upload`, formData);
      setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith("image/") ? "image" : "voice_note";
    uploadFile(file, type);
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: BlobPart[] = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
        await uploadFile(file, "voice_note");
        setIsRecording(false);
      };
      mr.start();
      setMediaRecorder(mr);
      setIsRecording(true);
    } catch { toast({ title: "Microphone access denied", variant: "destructive" }); }
  };

  const stopRecording = () => { mediaRecorder?.stop(); };

  const startVideoMeeting = () => {
    const roomName = `zentryx-${activeRoom?.name?.replace(/\s+/g, '-').toLowerCase() || 'meeting'}-${Date.now()}`;
    window.open(`https://meet.jit.si/${roomName}`, "_blank");
    toast({ title: "Video meeting started", description: "Jitsi Meet opened in a new tab. Share the link with team members." });
  };

  const createGroupRoom = async (name: string, memberIds: number[]) => {
    const room = await api.post("/chat/rooms", { name, isGroup: true, memberIds });
    setRooms(prev => [...prev, room]);
    selectRoom(room);
  };

  const createPrivateRoom = async (userId: number, userName: string) => {
    const room = await api.post("/chat/rooms", { name: `${userName}`, isGroup: false, memberIds: [userId] });
    setRooms(prev => { const exists = prev.find(r => r.id === room.id); return exists ? prev : [...prev, room]; });
    selectRoom(room);
  };

  if (loading && rooms.length === 0) return <PageLoader />;

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-0 rounded-2xl overflow-hidden glass-card border border-white/5">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-white/5 flex flex-col bg-white/[0.02]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-display font-bold text-foreground">Chat</h2>
          <div className="flex gap-1">
            <CreateGroupModal users={users} onCreate={createGroupRoom} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
          <div className="px-3 mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Channels</p>
          </div>
          {rooms.filter(r => r.isGroup).map(room => (
            <button key={room.id} onClick={() => selectRoom(room)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${activeRoom?.id === room.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
              <Hash className="w-4 h-4 shrink-0" />
              <span className="truncate">{room.name}</span>
            </button>
          ))}

          <div className="px-3 mt-4 mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Direct Messages</p>
          </div>
          {rooms.filter(r => !r.isGroup).map(room => (
            <button key={room.id} onClick={() => selectRoom(room)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${activeRoom?.id === room.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
              <Lock className="w-4 h-4 shrink-0" />
              <span className="truncate">{room.name}</span>
            </button>
          ))}

          <div className="px-3 mt-4 mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Team Members</p>
          </div>
          {users.filter(u => u.id !== currentUserId).map(user => (
            <button key={user.id} onClick={() => createPrivateRoom(user.id, user.name)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {user.name.charAt(0)}
              </div>
              <span className="truncate">{user.name}</span>
              <div className={`w-1.5 h-1.5 rounded-full ml-auto shrink-0 ${user.isActive ? "bg-green-400" : "bg-muted"}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {activeRoom.isGroup ? <Hash className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-primary" />}
                <h3 className="font-semibold text-foreground">{activeRoom.name}</h3>
                {activeRoom.isGroup && <span className="text-xs text-muted-foreground ml-1">Group Channel</span>}
              </div>
              <button onClick={startVideoMeeting} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors">
                <Video className="w-4 h-4" /> Start Meeting
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              {messages.map((msg, i) => {
                const isOwn = msg.senderId === currentUserId;
                const showName = !isOwn && (i === 0 || messages[i - 1].senderId !== msg.senderId);
                return (
                  <div key={msg.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    {!isOwn && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                        {msg.senderName?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className={`max-w-[65%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      {showName && !isOwn && (
                        <span className="text-xs text-muted-foreground font-medium">{msg.senderName}</span>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${isOwn ? "bg-primary text-white rounded-tr-sm" : "bg-white/8 text-foreground rounded-tl-sm"}`}>
                        {msg.messageType === "text" && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                        {msg.messageType === "image" && (
                          <a href={`${BASE}api${msg.fileUrl?.replace('/api', '')}`} target="_blank" rel="noopener noreferrer">
                            <img src={`${BASE}api${msg.fileUrl?.replace('/api', '')}`} alt={msg.fileName} className="max-w-xs max-h-48 rounded-xl object-cover" />
                          </a>
                        )}
                        {msg.messageType === "voice_note" && (
                          <div className="flex items-center gap-2 py-1">
                            <Mic className="w-4 h-4 text-primary" />
                            <audio controls src={`${BASE}api${msg.fileUrl?.replace('/api', '')}`} className="h-8 max-w-xs" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">{format(new Date(msg.createdAt), "h:mm a")}</span>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Hash className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-muted-foreground text-sm">No messages yet. Say hello!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,audio/*" className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors" title="Attach image">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-lg transition-colors ${isRecording ? "text-destructive bg-destructive/10 hover:bg-destructive/20" : "text-muted-foreground hover:text-foreground hover:bg-white/10"}`}
                    title={isRecording ? "Stop recording" : "Record voice note"}
                  >
                    {isRecording ? <StopCircle className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>
                <input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={isRecording ? "Recording voice note... click stop when done" : `Message ${activeRoom.name}...`}
                  disabled={isRecording}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMsg.trim() || sending}
                  className="p-2.5 bg-primary hover:bg-primary/80 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {isRecording && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" /> Recording voice note...
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-16 h-16 text-muted-foreground opacity-20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Select a channel or teammate</h3>
              <p className="text-muted-foreground text-sm mt-1">Choose from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateGroupModal({ users, onCreate }: { users: any[]; onCreate: (name: string, memberIds: number[]) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const toggle = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Create channel">
          <Plus className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] glass-panel border-white/10">
        <DialogHeader><DialogTitle>Create Group Channel</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. project-alpha" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Members</label>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {users.map(u => (
                <button key={u.id} type="button" onClick={() => toggle(u.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selected.includes(u.id) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{u.name.charAt(0)}</div>
                  {u.name}
                  <span className="ml-auto text-xs opacity-60">{u.role.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!name.trim()} onClick={() => { onCreate(name, selected); setOpen(false); setName(""); setSelected([]); }}>
              Create Channel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
