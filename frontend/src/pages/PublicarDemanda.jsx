import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Camera, MapPin, X, Video, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const PublicarDemanda = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState(user?.location || '');
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [toast, setToast] = useState('');
  const photoRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 3) return;
    files.forEach(f => setPhotos(prev => [...prev, { url: URL.createObjectURL(f), id: Math.random().toString(36) }]));
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) setVideos(prev => [...prev, { url: URL.createObjectURL(file), id: Math.random().toString(36) }]);
  };

  const handleSubmit = async () => {
    if (!description.trim()) { showToast('Adicione uma descrição'); return; }
    const post = {
      id: `pub-${Date.now()}`,
      userName: user?.name || 'Você',
      userAvatar: user?.avatar || '',
      time: 'postado agora',
      description,
      location: address || 'Brasil',
      budget: budget || 'A combinar',
      images: photos.map(p => p.url),
      videos: videos.map(v => v.url),
      likes: 0, recommends: 0, responses: 0
    };
    const existing = JSON.parse(localStorage.getItem('userPosts') || '[]');
    localStorage.setItem('userPosts', JSON.stringify([post, ...existing]));
    showToast('Pedido publicado com sucesso!');
    setTimeout(() => navigate('/feed'), 1000);

    // Also create on backend
    try {
      await api.post('/demands', {
        title: description.slice(0, 100),
        description,
        category: category || 'Outro',
        location: address || 'Brasil',
        budget: budget || 'A combinar',
        photos: photos.map(p => p.url)
      });
    } catch (error) {
      console.error('Erro ao publicar no backend:', error);
    }
  };

  const categories = ['Eletricista', 'Encanador', 'Pintor', 'Mudança', 'Limpeza', 'Montagem de móveis', 'Jardinagem', 'Reparos gerais', 'TI e Tecnologia', 'Aulas particulares', 'Outro'];

  return (
    <div className="min-h-screen bg-[#FFF5F3] pb-20">
      <Header />
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm">{toast}</div>}

      <div className="max-w-2xl mx-auto px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>

        <Card className="p-6">
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Publicar demanda
          </h1>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold mb-2 block">Descreva sua necessidade</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Olá, preciso de ajuda com..."
                className="w-full h-28 text-sm bg-white border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={500}
                data-testid="demand-description"
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Fotos e vídeos</label>
              <p className="text-xs text-gray-500 mb-3">Aumente suas chances em 25% ilustrando sua necessidade.</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {photos.map(p => (
                  <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos(prev => prev.filter(x => x.id !== p.id))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50">
                    <Camera className="w-8 h-8 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Adicionar</span>
                    <input type="file" accept="image/*" className="hidden" ref={photoRef} onChange={handlePhotoUpload} />
                  </label>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => cameraRef.current?.click()} className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100">
                  <Camera className="w-3.5 h-3.5" /> Tirar foto
                </button>
                <button onClick={() => videoRef.current?.click()} className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100">
                  <Video className="w-3.5 h-3.5" /> Vídeo
                </button>
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraRef} onChange={handlePhotoUpload} />
                <input type="file" accept="video/*" className="hidden" ref={videoRef} onChange={handleVideoUpload} />
              </div>
              {videos.map(v => (
                <div key={v.id} className="relative mt-2 rounded-lg overflow-hidden">
                  <video src={v.url} controls playsInline className="w-full rounded-lg object-cover" style={{ maxHeight: '200px' }} />
                  <button onClick={() => setVideos(prev => prev.filter(x => x.id !== v.id))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Endereço</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Seu endereço" className="h-10" data-testid="demand-address" />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Orçamento</label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex: R$ 200 ou A combinar" className="h-10" data-testid="demand-budget" />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${category === cat ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-600 hover:border-green-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-12 font-semibold" data-testid="submit-demand-btn">
              Publicar minha demanda
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PublicarDemanda;
