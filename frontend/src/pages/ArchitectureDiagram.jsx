import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  X,
  Building2,
  FileText,
  FileSearch,
  Radio,
  Database,
  Brain,
  ShieldCheck,
  Wallet,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Info,
  Zap,
  Globe,
  Lock,
} from 'lucide-react';

/* ─── Data ─── */

const NODES = [
  {
    id: 'sme',
    x: 120, y: 340, w: 130, h: 76,
    label: 'Malaysian SME',
    sublabel: 'SME User',
    Icon: Building2,
    color: '#22c55e',
    zone: 'local',
  },
  {
    id: 'invoice',
    x: 280, y: 200, w: 130, h: 76,
    label: 'Invoice / Shipment Doc',
    sublabel: 'Upload',
    Icon: FileText,
    color: '#22c55e',
    zone: 'local',
  },
  {
    id: 'docai',
    x: 480, y: 200, w: 150, h: 76,
    label: 'Document AI (MY)',
    sublabel: 'Alibaba Document AI',
    Icon: FileSearch,
    color: '#f97316',
    zone: 'alibaba',
  },
  {
    id: 'iot',
    x: 480, y: 480, w: 150, h: 76,
    label: 'Shipment Tracking (MY)',
    sublabel: 'Alibaba IoT Platform',
    Icon: Radio,
    color: '#f97316',
    zone: 'alibaba',
  },
  {
    id: 'fraud',
    x: 700, y: 340, w: 150, h: 76,
    label: 'Fraud Analysis (SG)',
    sublabel: 'AWS Fraud Detector',
    Icon: ShieldCheck,
    color: '#3b82f6',
    zone: 'aws',
  },
  {
    id: 'ml',
    x: 900, y: 340, w: 150, h: 76,
    label: 'ML Credit Engine (SG)',
    sublabel: 'AWS ML Engine',
    Icon: Brain,
    color: '#3b82f6',
    zone: 'aws',
  },
  {
    id: 'dynamodb',
    x: 1040, y: 200, w: 130, h: 76,
    label: 'Financial Ledger (SG)',
    sublabel: 'AWS DynamoDB',
    Icon: Database,
    color: '#3b82f6',
    zone: 'aws',
  },
  {
    id: 'wallet',
    x: 1120, y: 340, w: 120, h: 76,
    label: 'Instant Disbursement',
    sublabel: 'TNG Wallet',
    Icon: Wallet,
    color: '#22c55e',
    zone: 'local',
  },
];

const PATHS = [
  {
    id: 'sme-invoice',
    d: 'M 185 340 L 215 200',
    label: 'Upload PDF/Image',
    labelPos: { x: 200, y: 260 },
    stroke: '#22c55e',
    particleColor: '#22c55e',
    particles: 3,
    dur: 2.2,
    latency: '~120ms',
    latencyPos: { x: 200, y: 290 },
  },
  {
    id: 'invoice-docai',
    d: 'M 345 200 L 405 200',
    label: 'Extract Data (metadata only)',
    labelPos: { x: 375, y: 188 },
    stroke: '#22c55e',
    particleColor: '#22c55e',
    particles: 2,
    dur: 1.8,
    latency: '~200ms',
    latencyPos: { x: 375, y: 222 },
  },
  {
    id: 'docai-fraud',
    d: 'M 555 238 L 625 302',
    label: 'Risk Check',
    labelPos: { x: 620, y: 240 },
    stroke: '#f59e0b',
    particleColor: '#f59e0b',
    particles: 2,
    dur: 2.8,
    latency: '~180ms',
    latencyPos: { x: 630, y: 260 },
    boundaries: [
      { x: 590, y: 270, text: 'Only metadata crosses — no financial data on Alibaba' },
      { x: 640, y: 320, text: 'Risk scores & KYC never leave AWS' },
    ],
  },
  {
    id: 'sme-iot',
    d: 'M 185 340 L 405 480',
    label: 'IoT Telemetry',
    labelPos: { x: 295, y: 400 },
    stroke: '#22c55e',
    particleColor: '#22c55e',
    particles: 3,
    dur: 2.5,
    latency: '~85ms',
    latencyPos: { x: 295, y: 430 },
  },
  {
    id: 'iot-fraud',
    d: 'M 555 442 L 625 378',
    label: 'Verify Shipment',
    labelPos: { x: 630, y: 440 },
    stroke: '#f59e0b',
    particleColor: '#f59e0b',
    particles: 2,
    dur: 2.8,
    latency: '~150ms',
    latencyPos: { x: 630, y: 460 },
    boundaries: [
      { x: 590, y: 410, text: 'Only metadata crosses — no financial data on Alibaba' },
    ],
  },
  {
    id: 'fraud-ml',
    d: 'M 775 340 L 825 340',
    label: 'Score & Offer',
    labelPos: { x: 800, y: 328 },
    stroke: '#3b82f6',
    particleColor: '#3b82f6',
    particles: 2,
    dur: 1.8,
    latency: '~85ms',
    latencyPos: { x: 800, y: 358 },
  },
  {
    id: 'ml-dynamodb',
    d: 'M 975 302 L 975 238',
    label: 'Record Txn',
    labelPos: { x: 960, y: 270 },
    stroke: '#3b82f6',
    particleColor: '#3b82f6',
    particles: 2,
    dur: 1.4,
    latency: '~15ms',
    latencyPos: { x: 990, y: 270 },
  },
  {
    id: 'dynamodb-wallet',
    d: 'M 1105 200 L 1060 340',
    label: 'RM Disbursed',
    labelPos: { x: 1090, y: 260 },
    stroke: '#3b82f6',
    particleColor: '#3b82f6',
    particles: 2,
    dur: 1.8,
    latency: '~200ms',
    latencyPos: { x: 1090, y: 290 },
  },
];

const NODE_DETAILS = {
  sme: {
    title: 'Malaysian SME',
    description:
      'Small and medium enterprise using the TNG platform for invoice factoring and shipment financing. Uploads trade documents and receives instant cash offers directly to their wallet.',
    technology: 'TNG Mobile App, Web Portal, KYC Verification, Secure Login, MFA',
    dataHandled: 'Invoice PDFs, shipment documents, IoT device pairing, bank account details, KYC documents, offer acceptances',
    dataNotHandled: 'Credit scores, fraud analysis results, model weights, other merchant financial data',
  },
  invoice: {
    title: 'Invoice / Shipment Upload',
    description:
      'Secure document upload interface for invoices, bills of lading, packing lists, and other trade finance documents. Supports drag-and-drop with instant validation.',
    technology: 'React Dropzone, PDF Parser, Image Preprocessing, OCR Pipeline, Virus Scan',
    dataHandled: 'PDF invoices, image scans, metadata extraction, file validation, upload timestamps',
    dataNotHandled: 'Raw financial analysis, credit decisions, cross-merchant data, model internals',
  },
  docai: {
    title: 'Alibaba Document AI (MY)',
    description:
      'Malaysia-region document intelligence service for extracting structured data from trade documents. Processes invoices and shipment docs without storing financial data.',
    technology: 'Alibaba Cloud Document AI, OCR, NLP Entity Extraction, Rules Engine, Data Residency',
    dataHandled:
      'Document images, extracted text, structured metadata, confidence scores, entity labels',
    dataNotHandled:
      'Financial transaction data, PII, credit risk scores, KYC information, model internals, cross-border records',
  },
  iot: {
    title: 'Alibaba IoT Platform (MY)',
    description:
      'IoT device management and telemetry ingestion for shipment tracking across Malaysia. GPS and environmental sensors provide real-time shipment verification.',
    technology: 'Alibaba Cloud IoT Platform, MQTT Broker, Geo-fencing, Rules Engine, Device Shadow',
    dataHandled: 'GPS coordinates, temperature, humidity, motion sensors, device health, connectivity stats',
    dataNotHandled: 'Financial transaction data, PII, credit risk scores, KYC information, invoice content',
  },
  fraud: {
    title: 'AWS Fraud Detector (SG)',
    description:
      'Real-time fraud analysis engine running in Singapore. Evaluates document authenticity, duplicate invoice detection, and transaction risk patterns before scoring.',
    technology: 'AWS Fraud Detector, Machine Learning, Anomaly Detection, Rule-based Scoring, Entity Resolution',
    dataHandled: 'Document metadata, risk features, anomaly flags, historical patterns, KYC references, velocity checks',
    dataNotHandled: 'Raw device telemetry, model training data, Alibaba credentials, full invoice images',
  },
  ml: {
    title: 'AWS ML Credit Scoring Engine (SG)',
    description:
      'Machine learning pipeline for real-time credit risk assessment of SME merchants. Produces instant cash offers (up to 95% for invoices, 85% for shipments) based on risk score.',
    technology: 'scikit-learn, XGBoost, AWS SageMaker, Feature Store, SHAP Explainability, A/B Testing',
    dataHandled:
      'Feature vectors, risk scores (300-850), offer amounts, confidence intervals, feature importances, decision rationale',
    dataNotHandled:
      'Raw PII, direct device identifiers, full document images, cross-cloud model artifacts',
  },
  dynamodb: {
    title: 'AWS DynamoDB Financial Ledger (SG)',
    description:
      'High-performance NoSQL database for immutable transaction records, disbursement logs, and audit trails. Enables real-time reconciliation and compliance reporting.',
    technology: 'AWS DynamoDB, DAX Caching, DynamoDB Streams, Point-in-Time Recovery, Encryption at Rest',
    dataHandled:
      'Transaction records, disbursement logs, timestamps, offer histories, audit trails, factoring fees',
    dataNotHandled:
      'Device credentials, raw sensor data, model weights, PII in plaintext',
  },
  wallet: {
    title: 'TNG Wallet — Instant Disbursement',
    description:
      'Digital wallet integration for instant cash disbursement to Malaysian SMEs upon offer acceptance. Funds are transferred within seconds of approval.',
    technology: 'TNG Digital API, Real-time Transfer, Push Notification, Transaction Receipt, Settlement',
    dataHandled: 'Disbursement amounts, wallet IDs, transaction confirmations, receipt generation, fee deductions',
    dataNotHandled: 'Credit scores, model internals, cross-cloud credentials, merchant KYC documents',
  },
};

const ZONES = [
  {
    id: 'local-left',
    x: 40, y: 270, w: 160, h: 140, rx: 10,
    stroke: '#22c55e', label: 'User Device / TNG App',
    labelPos: { x: 120, y: 264 },
  },
  {
    id: 'alibaba',
    x: 340, y: 140, w: 260, h: 400, rx: 10,
    stroke: '#f97316', label: 'Alibaba Cloud — Malaysia',
    labelPos: { x: 470, y: 134 },
  },
  {
    id: 'aws',
    x: 600, y: 120, w: 440, h: 440, rx: 10,
    stroke: '#3b82f6', label: 'AWS — Singapore (Financial Processing)',
    labelPos: { x: 820, y: 114 },
  },
  {
    id: 'local-right',
    x: 1050, y: 270, w: 140, h: 140, rx: 10,
    stroke: '#22c55e', label: 'TNG App',
    labelPos: { x: 1120, y: 264 },
  },
];

/* ─── Helpers ─── */

function nodeRect(node) {
  return {
    x: node.x - node.w / 2,
    y: node.y - node.h / 2,
    w: node.w,
    h: node.h,
  };
}

function Particle({ pathId, color, dur, delay, burst }) {
  return (
    <circle r={burst ? 5 : 3.5} fill={color} opacity={burst ? 1 : 0.9}>
      <animateMotion
        dur={`${dur}s`}
        begin={delay ? `${delay}s` : '0s'}
        repeatCount={burst ? '1' : 'indefinite'}
        fill={burst ? 'freeze' : undefined}
      >
        <mpath href={`#path-${pathId}`} />
      </animateMotion>
    </circle>
  );
}

function BlockedBadge({ x, y, text, onEnter, onLeave }) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: 'help' }}
    >
      <circle r="14" fill="#ef4444" stroke="white" strokeWidth="2" />
      <line x1="-5" y1="-5" x2="5" y2="5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5" y1="-5" x2="-5" y2="5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="-38" y="-38" width="76" height="18" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
      <text
        x="0"
        y="-26"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        BLOCKED
      </text>
      <title>{text}</title>
    </g>
  );
}

/* ─── Component ─── */

export default function ArchitectureDiagram() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [burstKey, setBurstKey] = useState(0);
  const [burstActive, setBurstActive] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);

  const handleSimulate = useCallback(() => {
    setBurstKey((k) => k + 1);
    setBurstActive(true);
    setTimeout(() => setBurstActive(false), 4500);
  }, []);

  const handleNodeClick = (id) => {
    setSelectedNode((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-full bg-[#0f1117] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Finance Architecture</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Invoice Financing &amp; Shipment Tracking · Alibaba Cloud MY ↔ AWS SG
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 hidden sm:inline">
            <Info className="w-3.5 h-3.5 inline mr-1" />
            Click any node for details
          </span>
          <button
            onClick={handleSimulate}
            className="flex items-center gap-2 px-4 py-2.5 bg-tng-blue hover:bg-tng-blue-dark active:scale-95 rounded-lg transition-all text-sm font-semibold shadow-lg shadow-blue-900/30"
          >
            <Play className="w-4 h-4 fill-white" />
            Simulate Invoice Flow
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div className="flex-1 relative overflow-x-auto overflow-y-hidden" style={{ minHeight: 520 }}>
        <div className="min-w-[1100px] h-full">
          <svg
            viewBox="0 0 1200 680"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
          <defs>
            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* Gradients */}
            <linearGradient id="grad-local" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="grad-alibaba" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="grad-aws" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
            {/* Arrow marker */}
            <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#22c55e" />
            </marker>
            <marker id="arrow-gold" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#3b82f6" />
            </marker>
            {/* Revenue path definition */}
            <path id="path-revenue" d="M 1060 360 Q 1020 440 960 420" fill="none" />
            {/* Pulse animation */}
            <style>{`
              .pulse-ring {
                animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              }
              @keyframes pulse-ring {
                0% { r: 4; opacity: 1; }
                100% { r: 12; opacity: 0; }
              }
            `}</style>
          </defs>

          {/* Zone backgrounds */}
          {ZONES.map((z) => (
            <g key={z.id} opacity={0.35}>
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                rx={z.rx}
                fill={z.stroke}
                fillOpacity={0.06}
              />
            </g>
          ))}

          {/* Zone borders */}
          {ZONES.map((z) => (
            <g key={`${z.id}-border`}>
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                rx={z.rx}
                fill="none"
                stroke={z.stroke}
                strokeWidth="2"
                strokeDasharray="10 6"
                opacity={0.8}
              />
              <text
                x={z.labelPos.x}
                y={z.labelPos.y}
                textAnchor="middle"
                fill={z.stroke}
                fontSize="12"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
                opacity={0.9}
              >
                {z.label}
              </text>
            </g>
          ))}

          {/* Path definitions (invisible, for particles) */}
          {PATHS.map((p) => (
            <path key={`def-${p.id}`} id={`path-${p.id}`} d={p.d} fill="none" />
          ))}

          {/* Visible path lines */}
          {PATHS.map((p) => {
            const marker =
              p.stroke === '#22c55e'
                ? 'url(#arrow-green)'
                : p.stroke === '#f59e0b'
                ? 'url(#arrow-gold)'
                : 'url(#arrow-blue)';
            return (
              <g key={`line-${p.id}`}>
                <path
                  d={p.d}
                  stroke={p.stroke}
                  strokeWidth="2.5"
                  fill="none"
                  opacity={0.5}
                  markerEnd={marker}
                />
                <path
                  d={p.d}
                  stroke={p.stroke}
                  strokeWidth="1"
                  fill="none"
                  opacity={0.2}
                  strokeDasharray="4 4"
                />
              </g>
            );
          })}

          {/* Continuous particles */}
          {PATHS.map((p) =>
            Array.from({ length: p.particles }).map((_, i) => (
              <Particle
                key={`${p.id}-p-${i}`}
                pathId={p.id}
                color={p.particleColor}
                dur={p.dur}
                delay={i * (p.dur / p.particles)}
                burst={false}
              />
            ))
          )}

          {/* Revenue continuous particles */}
          {Array.from({ length: 3 }).map((_, i) => (
            <Particle
              key={`revenue-p-${i}`}
              pathId="revenue"
              color="#fbbf24"
              dur={2.5}
              delay={i * 0.8}
              burst={false}
            />
          ))}

          {/* Burst particles */}
          {burstActive && (
            <g key={`burst-${burstKey}`}>
              {PATHS.map((p) =>
                Array.from({ length: 3 }).map((_, i) => (
                  <Particle
                    key={`${p.id}-b-${i}`}
                    pathId={p.id}
                    color={p.particleColor}
                    dur={1.6}
                    delay={i * 0.25 + 0.1}
                    burst={true}
                  />
                ))
              )}
              {Array.from({ length: 3 }).map((_, i) => (
                <Particle
                  key={`revenue-b-${i}`}
                  pathId="revenue"
                  color="#fbbf24"
                  dur={1.6}
                  delay={i * 0.25 + 0.1}
                  burst={true}
                />
              ))}
            </g>
          )}

          {/* Revenue visualization box */}
          <g>
            <path
              d="M 1060 360 Q 1020 440 960 420"
              stroke="#fbbf24"
              strokeWidth="2"
              fill="none"
              opacity={0.5}
              strokeDasharray="4 4"
            />
            <rect
              x="900"
              y="404"
              width="120"
              height="32"
              rx="8"
              fill="#1a1d29"
              stroke="#fbbf24"
              strokeWidth="1.5"
              opacity={0.9}
            />
            <text
              x="960"
              y="425"
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="11"
              fontWeight="600"
              fontFamily="system-ui, sans-serif"
            >
              Factoring Fee: 2-5%
            </text>
          </g>

          {/* Boundary indicators */}
          {PATHS.filter((p) => p.boundaries).map((p) =>
            p.boundaries.map((b, i) => (
              <BlockedBadge
                key={`${p.id}-bnd-${i}`}
                x={b.x}
                y={b.y}
                text={b.text}
              />
            ))
          )}

          {/* Latency & throughput labels */}
          {PATHS.map((p) => (
            <g key={`stats-${p.id}`}>
              {p.latency && (
                <g>
                  <rect
                    x={p.latencyPos.x - 22}
                    y={p.latencyPos.y - 10}
                    width="44"
                    height="16"
                    rx="4"
                    fill="#0f1117"
                    fillOpacity="0.85"
                  />
                  <text
                    x={p.latencyPos.x}
                    y={p.latencyPos.y}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {p.latency}
                  </text>
                </g>
              )}
              {p.throughput && (
                <g>
                  <rect
                    x={p.throughputPos.x - 26}
                    y={p.throughputPos.y - 10}
                    width="52"
                    height="16"
                    rx="4"
                    fill="#0f1117"
                    fillOpacity="0.85"
                  />
                  <text
                    x={p.throughputPos.x}
                    y={p.throughputPos.y}
                    textAnchor="middle"
                    fill="#22c55e"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {p.throughput}
                  </text>
                </g>
              )}
              {p.label && (
                <text
                  x={p.labelPos.x}
                  y={p.labelPos.y}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="500"
                  fontFamily="system-ui, sans-serif"
                >
                  {p.label}
                </text>
              )}
            </g>
          ))}

          {/* Nodes */}
          {NODES.map((node) => {
            const r = nodeRect(node);
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;
            const gradId =
              node.zone === 'alibaba'
                ? 'grad-alibaba'
                : node.zone === 'aws'
                ? 'grad-aws'
                : 'grad-local';
            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow */}
                {(isHovered || isSelected) && (
                  <rect
                    x={r.x - 4}
                    y={r.y - 4}
                    width={r.w + 8}
                    height={r.h + 8}
                    rx={14}
                    fill="none"
                    stroke={node.color}
                    strokeWidth="2"
                    opacity={0.6}
                    filter="url(#strongGlow)"
                  />
                )}
                {/* Body */}
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={12}
                  fill={`url(#${gradId})`}
                  stroke={node.color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={0.95}
                />
                {/* Status dot */}
                <circle
                  cx={r.x + r.w - 14}
                  cy={r.y + 14}
                  r="4.5"
                  fill="#22c55e"
                />
                <circle
                  cx={r.x + r.w - 14}
                  cy={r.y + 14}
                  r="4.5"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                  className="pulse-ring"
                />
                {/* Icon via foreignObject */}
                <foreignObject
                  x={r.x + 10}
                  y={r.y + 10}
                  width="28"
                  height="28"
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <node.Icon
                      className="w-5 h-5"
                      style={{ color: node.color }}
                    />
                  </div>
                </foreignObject>
                {/* Labels */}
                <text
                  x={r.x + r.w / 2}
                  y={r.y + 50}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="system-ui, sans-serif"
                >
                  {node.label}
                </text>
                <text
                  x={r.x + r.w / 2}
                  y={r.y + 64}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="system-ui, sans-serif"
                >
                  {node.sublabel}
                </text>
              </g>
            );
          })}
          </svg>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedNode && NODE_DETAILS[selectedNode] && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-4 right-4 bottom-4 w-80 bg-[#1a1d29] border border-white/10 rounded-xl shadow-2xl overflow-auto"
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${NODES.find((n) => n.id === selectedNode).color}20`,
                      }}
                    >
                      {(() => {
                        const Icon = NODES.find((n) => n.id === selectedNode).Icon;
                        return (
                          <Icon
                            className="w-5 h-5"
                            style={{
                              color: NODES.find((n) => n.id === selectedNode).color,
                            }}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm leading-tight">
                        {NODE_DETAILS[selectedNode].title}
                      </h3>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {NODES.find((n) => n.id === selectedNode).sublabel}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded-md hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 flex items-center gap-1.5">
                    <Info className="w-3 h-3" />
                    Description
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {NODE_DETAILS[selectedNode].description}
                  </p>
                </div>

                {/* Technology */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    Technology
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {NODE_DETAILS[selectedNode].technology.split(', ').map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-gray-300 border border-white/5"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Data Handled */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    Data Handled
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {NODE_DETAILS[selectedNode].dataHandled}
                  </p>
                </div>

                {/* Data NOT Handled */}
                <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3">
                  <h4 className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3" />
                    Data NOT Handled
                  </h4>
                  <p className="text-xs text-red-200/80 leading-relaxed">
                    {NODE_DETAILS[selectedNode].dataNotHandled}
                  </p>
                </div>

                {/* Constraint badge for demo */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <Lock className="w-3 h-3" />
                    <span>Cross-cloud compliance verified</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Legend */}
      <div className="px-6 py-3 border-t border-white/10 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5 text-xs">
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              SME / Wallet
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Document / IoT Metadata
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Fraud &amp; Credit Engine
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Data Boundary (Blocked)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-green-400" />
              All nodes healthy
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              Cross-cloud active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
