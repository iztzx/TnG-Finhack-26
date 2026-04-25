import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#0B0F1A_0%,_#0F2A5C_50%,_#0B0F1A_100%)]">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-600 opacity-20 mix-blend-screen blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan-400 opacity-20 mix-blend-screen blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-12 text-center">
        <div className="inline-block rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-[12px] font-semibold tracking-[0.08em] text-blue-200">
          BUILT FOR MALAYSIA'S SME ECONOMY
        </div>

        <h1 className="mt-8">
          <div className="text-[52px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            Invoice Financing
          </div>
          <div className="text-[52px] font-extrabold leading-[1.05] tracking-[-0.03em] text-blue-300">
            at the Speed of AI.
          </div>
        </h1>

        <p className="mt-6 max-w-2xl text-[16px] leading-7 text-white/65">
          PantasFlow advances up to 95% of your invoice value in seconds, not months. Risk scoring, document intelligence,
          satellite-backed shipment visibility, and partner location feeds work together in one financing workflow.
        </p>

        <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate('/register')}
            className="rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(37,99,235,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Get Started Free →
          </button>

          <button
            onClick={() => navigate('/login')}
            className="rounded-xl border border-white/20 px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/6"
          >
            Sign In
          </button>
        </div>

        <div className="mt-12 grid w-full max-w-4xl gap-4 md:grid-cols-3">
          {[
            { title: 'Instant decisioning', detail: 'OCR, fraud scoring, and offer generation in a single pass.' },
            { title: 'Shipment confidence', detail: 'Verified with satellite imagery, customs events, and partner location APIs.' },
            { title: 'Operator-ready controls', detail: 'Clear admin visibility for treasury, approvals, and risk operations.' },
          ].map((item) => (
            <button
              key={item.title}
              onClick={() => navigate('/login')}
              className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-left backdrop-blur transition-all hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-white/8"
            >
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-white/60">{item.detail}</p>
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-[12px] text-white/45">
          <span>✓ BNM Compliant</span>
          <span>•</span>
          <span>✓ 256-bit Encrypted</span>
          <span>•</span>
          <span>✓ SSM Verified</span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25">
          <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FF9900]" /> AWS</div>
          <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> Satellite Imagery</div>
          <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" /> Partner Location APIs</div>
          <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#ED2E38]" /> DuitNow</div>
        </div>

        <footer className="mt-16 w-full border-t border-white/8 pt-6 pb-4 text-center">
          <p className="text-[12px] text-white/25">&copy; 2026 PantasFlow by TnG Digital. All rights reserved.</p>
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-white/30">
            <span>Privacy Policy</span>
            <span>|</span>
            <span>Terms of Service</span>
            <span>|</span>
            <span>BNM Compliant</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
