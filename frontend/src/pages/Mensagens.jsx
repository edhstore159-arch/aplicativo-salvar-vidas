import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';
import { Send, Paperclip, Camera, Star, Phone, Video, Share2, Pin, Archive, Flag, Ban, X, Calendar, CreditCard, MoreHorizontal, Clock, Check, AlertTriangle, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const mockConversations = [
  {
    id: '1', name: 'Linda L.', avatar: 'https://i.pravatar.cc/150?img=47', rating: 5, reviewCount: 2, date: '01/11/2025',
    service: 'Mudanças e ajuda com mudança', lastMessage: 'Você: sim', unread: false, status: 'pending',
    messages: [
      { id: 'm1', type: 'system', text: 'Pedido privado', detail: 'Aqui está meu pedido privado. Aguardo sua resposta.', time: '10:10', date: 'seg. 16 jun 2025', fromMe: false, hasAction: true },
      { id: 'm2', type: 'text', text: 'sim', time: '19:15', date: 'sáb. 01 nov 2025', fromMe: true, read: false },
    ]
  },
  {
    id: '2', name: 'Usuário suspens...', avatar: '', rating: 0, reviewCount: 0, date: '03/04/2025',
    service: 'Vendedor - Comercial', lastMessage: 'Você: Olá', unread: true, status: 'active',
    messages: [
      { id: 'm3', type: 'text', text: 'Olá, tudo bem?', time: '14:30', date: 'qui. 03 abr 2025', fromMe: false },
      { id: 'm4', type: 'text', text: 'Olá', time: '14:35', date: 'qui. 03 abr 2025', fromMe: true, read: true },
    ]
  },
  {
    id: '3', name: 'Cléo M.', avatar: 'https://i.pravatar.cc/150?img=32', rating: 0, reviewCount: 5, date: '25/09/2024',
    service: 'Montagem de móveis em kit', lastMessage: 'Você: Disponível', unread: false, status: 'active',
    messages: [
      { id: 'm5', type: 'text', text: 'Preciso de ajuda para montar um armário.', time: '09:00', date: 'qua. 25 set 2024', fromMe: false },
      { id: 'm6', type: 'text', text: 'Disponível', time: '09:15', date: 'qua. 25 set 2024', fromMe: true, read: true },
    ]
  },
  {
    id: '4', name: 'Julien S.', avatar: 'https://i.pravatar.cc/150?img=11', rating: 4, reviewCount: 5, date: '25/09/2024',
    service: 'Montagem de móveis em kit', lastMessage: 'Você: Disponível', unread: false, status: 'active',
    messages: []
  },
  {
    id: '5', name: 'Milla R.', avatar: 'https://i.pravatar.cc/150?img=23', rating: 3, reviewCount: 5, date: '24/09/2024',
    service: 'Mudanças e ajuda com mudança', lastMessage: 'Você: Disponível', unread: false, status: 'completed',
    messages: []
  }
];

const Mensagens = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('todas');
  const [conversations, setConversations] = useState(mockConversations);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    date: '',
    startTime: '20:15',
    endTime: '21:45',
    type: 'video',
    address: '',
    notes: ''
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [actionToast, setActionToast] = useState('');
  const [attachedPhoto, setAttachedPhoto] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const conv = conversations.find(c => c.id === selectedConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvId, conv?.messages?.length]);

  // Auto-create or select a conversation when arriving with query params
  // e.g. /mensagens?userId=abc&userName=João&userAvatar=...&service=...
  useEffect(() => {
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    if (!userId || !userName) return;

    const userAvatar = searchParams.get('userAvatar') || '';
    const service = searchParams.get('service') || 'Novo contato';
    const convId = `auto-${userId}`;

    setConversations(prev => {
      const existing = prev.find(c => c.id === convId || c.name === userName);
      if (existing) {
        setSelectedConvId(existing.id);
        return prev;
      }
      const newConv = {
        id: convId,
        name: userName,
        avatar: userAvatar,
        rating: 0,
        reviewCount: 0,
        date: new Date().toLocaleDateString('pt-BR'),
        service,
        lastMessage: 'Inicie a conversa',
        unread: false,
        status: 'active',
        messages: [
          {
            id: `m-${Date.now()}`,
            type: 'system',
            text: 'Pedido público',
            detail: service,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
            fromMe: false,
          },
        ],
      };
      setSelectedConvId(convId);
      return [newConv, ...prev];
    });

    // Clean up URL so reload doesn't recreate the conversation again
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const showToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(''), 3000);
  };

  const addSystemMessage = (text) => {
    if (!conv) return;
    const sysMsg = {
      id: `sys-${Date.now()}`,
      type: 'system',
      text,
      detail: '',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: 'Hoje',
      fromMe: true
    };
    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, messages: [...c.messages, sysMsg], lastMessage: `Você: ${text}` } : c
    ));
  };

  const handleSend = () => {
    if (!message.trim() && !attachedPhoto) return;
    if (!conv) return;
    const newMsg = {
      id: `m${Date.now()}`,
      type: attachedPhoto ? 'image' : 'text',
      text: message || '',
      imageUrl: attachedPhoto || null,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: 'Hoje',
      fromMe: true,
      read: false
    };
    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, messages: [...c.messages, newMsg], lastMessage: `Você: ${message || 'Foto'}` } : c
    ));
    setMessage('');
    setAttachedPhoto(null);
  };

  const handleSchedule = () => {
    if (!scheduleData.date) { showToast('Selecione uma data'); return; }
    const typeLabel = { video: 'Chamada de vídeo', demanda: 'Endereço da demanda', prestador: `Casa de ${conv?.name}`, outro: 'Outro endereço' }[scheduleData.type] || 'Encontro';
    addSystemMessage(`Agendamento: ${scheduleData.date} ${scheduleData.startTime}-${scheduleData.endTime} • ${typeLabel}`);
    setShowScheduleModal(false);
    setScheduleData({ date: '', startTime: '20:15', endTime: '21:45', type: 'video', address: '', notes: '' });
    showToast('Agendamento enviado com sucesso!');
  };

  const handlePayment = () => {
    if (!paymentAmount) { showToast('Informe o valor'); return; }
    addSystemMessage(`Solicitação de pagamento via PIX: R$ ${paymentAmount}`);
    setShowPaymentModal(false);
    setPaymentAmount('');
    showToast('Solicitação de pagamento enviada!');
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText('3ef11200-bebf-4d88-930c-48e84b11cfc4');
    showToast('Chave PIX copiada!');
  };

  const handleDecline = () => {
    addSystemMessage(`Pedido recusado${declineReason ? `: ${declineReason}` : ''}`);
    setConversations(prev => prev.map(c =>
      c.id === conv?.id ? { ...c, status: 'declined' } : c
    ));
    setShowDeclineModal(false);
    setDeclineReason('');
    showToast('Pedido recusado');
  };

  const handlePhotoAttach = (e) => {
    const file = e.target.files[0];
    if (file) setAttachedPhoto(URL.createObjectURL(file));
  };

  const filtered = filter === 'nao-lidas' ? conversations.filter(c => c.unread) : filter === 'arquivadas' ? [] : conversations;

  return (
    <div className="min-h-screen bg-[#FFF5F3] pb-16 md:pb-0">
      <Header />

      {/* Action Toast */}
      {actionToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm" data-testid="action-toast">
          <Check className="w-4 h-4 inline mr-2" />{actionToast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 py-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-80px)] flex overflow-hidden">

          {/* LEFT - Conversation List */}
          <div className="w-72 border-r border-gray-200 flex flex-col" data-testid="conversations-list">
            <div className="flex border-b border-gray-200">
              {['todas', 'nao-lidas', 'arquivadas'].map(f => (
                <button key={f} onClick={() => setFilter(f)} data-testid={`filter-${f}`}
                  className={`flex-1 py-3 text-xs font-medium transition-colors ${filter === f ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700'}`}>
                  {f === 'todas' ? 'Todas' : f === 'nao-lidas' ? 'Não lidas' : 'Arquivadas'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhuma conversa</p>
              ) : filtered.map(c => (
                <div key={c.id} onClick={() => setSelectedConvId(c.id)} data-testid={`conv-${c.id}`}
                  className={`px-3 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedConvId === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback className="bg-gray-200 text-gray-500 text-sm">{c.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm truncate">{c.name}</h4>
                        <span className="text-xs text-gray-400 flex-shrink-0">{c.date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span>{c.rating}/5 ({c.reviewCount} avis)</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{c.service}</p>
                      <p className="text-xs text-gray-400 truncate">{c.lastMessage}</p>
                    </div>
                    {c.unread && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER - Chat Area */}
          <div className="flex-1 flex flex-col" data-testid="chat-area">
            {conv ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={conv.avatar} />
                    <AvatarFallback>{conv.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm">{conv.name}</h3>
                    <p className="text-xs text-gray-500">{conv.service}</p>
                  </div>
                  {conv.status === 'declined' && (
                    <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Recusado</span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto bg-white">
                  {conv.messages.length === 0 && (
                    <p className="text-center text-sm text-gray-400 mt-8">Nenhuma mensagem ainda. Inicie a conversa!</p>
                  )}
                  {conv.messages.map((msg, i) => {
                    const showDate = i === 0 || conv.messages[i - 1]?.date !== msg.date;
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="text-center my-4">
                            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{msg.date}</span>
                          </div>
                        )}
                        <div className={`flex mb-3 ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                          {!msg.fromMe && (
                            <Avatar className="w-7 h-7 mr-2 flex-shrink-0 mt-1">
                              <AvatarImage src={conv.avatar} />
                              <AvatarFallback className="text-xs">{conv.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            msg.fromMe
                              ? 'bg-blue-500 text-white rounded-br-md'
                              : msg.type === 'system'
                                ? 'bg-[#E8F4FD] rounded-bl-md'
                                : 'bg-gray-100 rounded-bl-md'
                          }`}>
                            {msg.type === 'system' && <p className="text-sm font-semibold text-blue-700 mb-1">{msg.text}</p>}
                            {msg.type === 'system' && msg.detail && <p className="text-sm text-gray-700">{msg.detail}</p>}
                            {msg.type === 'system' && msg.hasAction && (
                              <Button size="sm" variant="outline" className="mt-2 text-xs border-blue-300 text-blue-700">Consultar</Button>
                            )}
                            {msg.type === 'text' && <p className="text-sm">{msg.text}</p>}
                            {msg.type === 'image' && (
                              <div>
                                {msg.imageUrl && <img src={msg.imageUrl} alt="Foto" className="max-w-full rounded-lg mb-1" />}
                                {msg.text && <p className="text-sm">{msg.text}</p>}
                              </div>
                            )}
                            <div className={`flex items-center gap-1 mt-1 ${msg.fromMe ? 'justify-end' : ''}`}>
                              <span className={`text-xs ${msg.fromMe ? 'text-blue-100' : 'text-gray-400'}`}>{msg.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Action Buttons */}
                <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto">
                  <button onClick={() => setShowDeclineModal(true)} className="flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors" data-testid="action-decline">
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-xs text-gray-600 mt-0.5">Recusar</span>
                  </button>
                  <button onClick={() => setShowScheduleModal(true)} className="flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors" data-testid="action-schedule">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="text-xs text-gray-600 mt-0.5">Agendar</span>
                  </button>
                  <button onClick={() => setShowPaymentModal(true)} className="flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors" data-testid="action-payment">
                    <CreditCard className="w-5 h-5 text-green-500" />
                    <span className="text-xs text-gray-600 mt-0.5">Pagamento</span>
                  </button>
                  <button onClick={() => setShowMoreActions(!showMoreActions)} className="flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors relative" data-testid="action-more">
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    <span className="text-xs text-gray-600 mt-0.5">Ver tudo</span>
                    {showMoreActions && (
                      <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 z-10" data-testid="more-actions-menu">
                        <button onClick={() => { addSystemMessage('Serviço marcado como concluído'); showToast('Serviço concluído!'); setShowMoreActions(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />Marcar como concluído
                        </button>
                        <button onClick={() => { showToast('Conversa arquivada'); setShowMoreActions(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                          <Archive className="w-4 h-4" />Arquivar conversa
                        </button>
                        <button onClick={() => { showToast('Perfil denunciado'); setShowMoreActions(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-500">
                          <Flag className="w-4 h-4" />Denunciar
                        </button>
                      </div>
                    )}
                  </button>
                </div>

                {/* Photo Preview */}
                {attachedPhoto && (
                  <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2">
                    <img src={attachedPhoto} alt="Anexo" className="w-16 h-16 object-cover rounded-lg" />
                    <button onClick={() => setAttachedPhoto(null)} className="text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                )}

                {/* Message Input */}
                <div className="px-4 py-3 border-t border-gray-200 bg-white">
                  <div className="flex items-center gap-2">
                    <button className="text-gray-400 hover:text-gray-600" onClick={() => fileInputRef.current?.click()} data-testid="attach-file-btn">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600" onClick={() => fileInputRef.current?.click()} data-testid="attach-photo-btn">
                      <Camera className="w-5 h-5" />
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoAttach} />
                    <Input data-testid="message-input" placeholder="Sua mensagem" value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      className="flex-1 h-10 rounded-full border-gray-200" />
                    <Button data-testid="send-message-btn" onClick={handleSend} size="sm"
                      className="bg-green-500 hover:bg-green-600 rounded-full w-10 h-10 p-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MessageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">Selecione uma conversa</p>
                  <p className="text-sm">para começar a conversar</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT - Profile Sidebar */}
          {conv && (
            <div className="w-72 border-l border-gray-200 flex flex-col p-4 overflow-y-auto" data-testid="profile-sidebar">
              <div className="text-center mb-4">
                <Avatar className="w-16 h-16 mx-auto mb-2">
                  <AvatarImage src={conv.avatar} />
                  <AvatarFallback className="text-xl bg-gray-200">{conv.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-lg">{conv.name}</h3>
                <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span>{conv.rating}/5 ({conv.reviewCount} avis)</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{conv.service}</p>
              </div>

              <div className="flex items-center justify-center gap-3 mb-4">
                <button
                  onClick={() => { addSystemMessage('Chamada de vídeo iniciada'); showToast('Chamada de vídeo iniciada com ' + conv.name); }}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  data-testid="video-call-btn"
                >
                  <Video className="w-4 h-4 text-blue-500" />
                </button>
                <button
                  onClick={() => { addSystemMessage('Chamada de voz iniciada'); showToast('Ligando para ' + conv.name + '...'); }}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-green-50 hover:border-green-300 transition-colors"
                  data-testid="phone-call-btn"
                >
                  <Phone className="w-4 h-4 text-green-500" />
                </button>
                <Button variant="outline" size="sm" className="rounded-full text-xs" data-testid="view-profile-btn">
                  Ver perfil
                </Button>
              </div>

              <div className="space-y-1 border-t border-gray-100 pt-4">
                <button onClick={() => showToast('Link copiado!')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  <Share2 className="w-4 h-4" /> Compartilhar perfil
                </button>
                <button onClick={() => showToast('Conversa fixada!')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  <Pin className="w-4 h-4" /> Fixar conversa
                </button>
                <button onClick={() => showToast('Conversa arquivada!')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  <Archive className="w-4 h-4" /> Arquivar conversa
                </button>
              </div>

              <div className="space-y-1 border-t border-gray-100 pt-4 mt-4">
                <button onClick={() => showToast('Perfil denunciado!')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">
                  <Flag className="w-4 h-4" /> Denunciar perfil
                </button>
                <button onClick={() => showToast('Usuário bloqueado!')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  <Ban className="w-4 h-4" /> Bloquear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal - Completo com modalidades */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-lg font-bold">Propor um agendamento</DialogTitle>
          <div className="space-y-4 mt-2">
            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2">Vantagens do agendamento:</p>
              <ul className="space-y-1 text-gray-700 text-xs">
                <li>• Compromisso mútuo</li>
                <li>• Lembrete por SMS antes do encontro</li>
                <li>• Lançamento automático de navegação GPS</li>
                <li>• Lembrete: deixar avaliação após o encontro</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Data</label>
              <Input type="date" value={scheduleData.date}
                onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                className="h-10" data-testid="schedule-date" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Início</label>
                <Input type="time" value={scheduleData.startTime}
                  onChange={(e) => setScheduleData({ ...scheduleData, startTime: e.target.value })}
                  className="h-10" data-testid="schedule-start-time" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Fim</label>
                <Input type="time" value={scheduleData.endTime}
                  onChange={(e) => setScheduleData({ ...scheduleData, endTime: e.target.value })}
                  className="h-10" data-testid="schedule-end-time" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Modalidades</label>
              <div className="space-y-2">
                {[
                  { value: 'video', label: 'Chamada de voz ou vídeo' },
                  { value: 'demanda', label: 'No endereço da demanda' },
                  { value: 'prestador', label: `Na casa de ${conv?.name || 'prestador'}` },
                  { value: 'outro', label: 'Outro endereço' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer text-sm">
                    <input type="radio" name="scheduleType" value={opt.value}
                      checked={scheduleData.type === opt.value}
                      onChange={(e) => setScheduleData({ ...scheduleData, type: e.target.value })}
                      className="w-4 h-4 accent-blue-500" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Notas <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
              <textarea value={scheduleData.notes}
                onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                placeholder="Ex: itinerário, código do interfone..."
                className="w-full h-20 text-sm border border-gray-300 rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={500} />
              <p className="text-xs text-gray-500 text-right">{scheduleData.notes.length}/500</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowScheduleModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSchedule} disabled={!scheduleData.date}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-full" data-testid="schedule-confirm-btn">
                <Calendar className="w-4 h-4 mr-2" />Propor agendamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal - Pagamento via PIX com QR Code */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-center text-lg font-bold">Pagamento via PIX</DialogTitle>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-semibold mb-1 block">Valor (R$)</label>
              <Input type="number" placeholder="0,00" value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="h-11 text-lg" data-testid="payment-amount" />
            </div>

            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-lg border-4 border-green-500">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=00020126580014br.gov.bcb.pix0136jonhsondecarvalho@gmail.com520400005303986540551965.655802BR5925JONHSON%20DE%20SOUSA%20CARV6009SAO%20PAULO62290525ERI51965652CARVALHO63041F20"
                  alt="QR Code PIX" className="w-52 h-52" />
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-600 text-xs font-semibold">Beneficiário:</p>
                <p className="font-bold">JONHSON DE SOUSA CARVALHO</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-semibold">Chave PIX:</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded flex-1 break-all">
                    3ef11200-bebf-4d88-930c-48e84b11cfc4
                  </p>
                  <Button size="sm" variant="outline" onClick={copyPixKey} data-testid="copy-pix-btn">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-semibold">Instituição:</p>
                <p className="font-medium text-sm">NU PAGAMENTOS - IP</p>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-700">
              <p className="font-semibold mb-1">Como pagar:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Abra o app do seu banco</li>
                <li>Escaneie o QR Code ou copie a chave PIX</li>
                <li>Confirme o pagamento</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handlePayment} disabled={!paymentAmount}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white" data-testid="payment-confirm-btn">
                <CreditCard className="w-4 h-4 mr-2" />Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Modal */}
      <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-lg font-bold">Recusar pedido</DialogTitle>
          <div className="space-y-4 mt-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">Ao recusar, o solicitante será notificado.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Motivo (opcional)</label>
              <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Ex: Não estou disponível nessa data..."
                className="w-full mt-1 border border-gray-200 rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-200"
                data-testid="decline-reason" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeclineModal(false)} className="flex-1">Voltar</Button>
              <Button onClick={handleDecline} className="flex-1 bg-red-500 hover:bg-red-600 text-white" data-testid="decline-confirm-btn">
                <X className="w-4 h-4 mr-2" />Recusar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MessageIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
  </svg>
);

export default Mensagens;
