import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B0F1A 0%, #0F2A5C 50%, #0B0F1A 100%)' }}>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen opacity-20" style={{ filter: 'blur(80px)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-screen opacity-20" style={{ filter: 'blur(80px)' }}></div>
      </div>
      
      <div className="relative z-10 w-full max-w-[600px] flex flex-col items-center justify-center text-center px-6">
        <div 
          className="inline-block mb-6 rounded-full px-4 py-1.5 font-semibold tracking-wide"
          style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', fontSize: '12px', color: '#93C5FD', letterSpacing: '0.06em' }}
        >
          🇲🇾 BUILT FOR MALAYSIA'S SME ECONOMY
        </div>
        
        <h1 className="mb-6">
          <div style={{ fontSize: '52px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Invoice Financing
          </div>
          <div style={{ fontSize: '52px', fontWeight: 800, color: '#60A5FA', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            at the Speed of AI.
          </div>
        </h1>
        
        <p className="mb-10" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: '480px' }}>
          PantasFlow advances up to 95% of your invoice value in seconds — not months. Powered by AWS SageMaker and Alibaba Cloud Document AI.
        </p>
        
        <div className="flex items-center justify-center gap-3 mb-10 w-full">
          <button 
            onClick={() => navigate('/register')}
            className="rounded-xl px-7 py-3.5 text-[15px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: '#2563EB' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            Get Started Free →
          </button>
          
          <button 
            onClick={() => navigate('/login')}
            className="rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-200"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          >
            Sign In
          </button>
        </div>
        
        <div className="flex items-center justify-center gap-4" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          <span>✓ BNM Compliant</span>
          <span>•</span>
          <span>✓ 256-bit Encrypted</span>
          <span>•</span>
          <span>✓ SSM Verified</span>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-0 w-full flex justify-center items-center gap-6" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]"></span> AWS</div>
        <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#FF6600]"></span> Alibaba Cloud</div>
        <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#ED2E38]"></span> DuitNow</div>
      </div>
    </div>
  );
};

export default Landing;
