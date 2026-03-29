import { useEffect, useState } from "react";
import { Camera, Upload, Scan, Leaf, AlertTriangle, Bot, X } from "lucide-react";
import { useToast } from "../hooks/use-toast";

// This is a basic dialog component to replace the one from the UI library
const CustomDialog = ({ isOpen, onOpenChange, children }: { isOpen: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.dialogOverlay} onClick={() => onOpenChange(false)}>
      <div style={styles.dialogContent} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={() => onOpenChange(false)}>
          <X size={24} color="#A0AEC0" />
        </button>
        {children}
      </div>
    </div>
  );
};

interface ImageUploadProps {
  onBothUploadedChange?: (uploaded: boolean) => void;
  setCrop?: (crop: string) => void;
}

const ImageUpload = ({ onBothUploadedChange, setCrop }: ImageUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File[] }>({});
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // State for managing hover effects on buttons
  const [isGeneralHovered, setGeneralHovered] = useState(false);
  const [isDiseaseHovered, setDiseaseHovered] = useState(false);
  const [isStartHovered, setStartHovered] = useState(false);
  const [isTriggerHovered, setTriggerHovered] = useState(false);

  useEffect(() => {
    const hasGeneral = (selectedFiles.general?.length ?? 0) > 0;
    const hasDisease = (selectedFiles.disease?.length ?? 0) > 0;
    onBothUploadedChange?.(hasGeneral && hasDisease);
  }, [selectedFiles, onBothUploadedChange]);

  const handleFileUpload = (type: string, files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => ({
        ...prev,
        [type]: fileArray
      }));
      
      toast({
        title: "Images uploaded successfully",
        description: `${fileArray.length} image(s) selected for ${type === 'general' ? 'crop monitoring' : 'disease detection'}`,
      });
    }
  };

  const triggerFileInput = (inputId: string) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    input?.click();
  };

  return (
    <>
      {/* AI Assistant Button Trigger */}
      <button
        style={{
            ...styles.baseButton,
            ...styles.triggerButton,
            ...(isTriggerHovered ? styles.triggerButtonHover : {})
        }}
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Bot color="white" size={24} />
            <div style={styles.pulseDot}></div>
          </div>
          <span style={{ fontWeight: 600 }}>Get AI Crop Analysis</span>
        </div>
      </button>

      <CustomDialog isOpen={isOpen} onOpenChange={setIsOpen}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '8px' }}>
              AI Crop Analysis Assistant
            </h2>
            <p style={{ color: '#A0AEC0', fontSize: '1.125rem' }}>
              Get personalized advice by uploading your crop images for AI-powered analysis
            </p>
          </div>

          <div style={styles.gridContainer}>
            {/* General Crop Monitoring Card */}
            <div style={{...styles.card, borderLeft: '4px solid #48BB78'}}>
                {/* Card Header */}
                <div style={{ padding: '24px 24px 16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(72, 187, 120, 0.1)', padding: '12px', borderRadius: '9999px' }}>
                      <Leaf size={24} color="#48BB78" />
                    </div>
                    <div>
                      <h3 style={styles.cardTitle}>Crop Monitoring</h3>
                      <p style={styles.cardDescription}>General health assessment & 360° view analysis</p>
                    </div>
                  </div>
                </div>
                
                {/* Card Content */}
                <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <p style={styles.cardParagraph}>
                      Upload general images or 360° views of your crops for comprehensive health monitoring, 
                      growth analysis, and yield prediction using advanced AI algorithms.
                    </p>
                    
                    <div style={styles.bulletGrid}>
                      <div style={styles.bulletItem}><div style={{...styles.bulletDot, backgroundColor: '#48BB78'}}></div>Growth stage analysis</div>
                      <div style={styles.bulletItem}><div style={{...styles.bulletDot, backgroundColor: '#48BB78'}}></div>Yield prediction</div>
                      <div style={styles.bulletItem}><div style={{...styles.bulletDot, backgroundColor: '#48BB78'}}></div>Overall health assessment</div>
                      <div style={styles.bulletItem}><div style={{...styles.bulletDot, backgroundColor: '#48BB78'}}></div>Nutrient deficiency detection</div>
                    </div>
                  </div>

                  <div style={{...styles.uploadBox, border: '2px dashed rgba(72, 187, 120, 0.4)'}}>
                    <Camera size={40} color="rgba(72, 187, 120, 0.6)" style={{ marginBottom: '12px' }}/>
                    <p style={{ fontSize: '12px', color: '#A0AEC0', marginBottom: '12px' }}>
                      {selectedFiles.general?.length > 0 
                        ? `${selectedFiles.general.length} image(s) selected` 
                        : "Drag & drop images or click to browse"}
                    </p>
                    <button 
                      style={{ ...styles.baseButton, ...styles.generalButton, ...(isGeneralHovered ? styles.generalButtonHover : {}) }}
                      onClick={() => triggerFileInput('general-upload')}
                      onMouseEnter={() => setGeneralHovered(true)}
                      onMouseLeave={() => setGeneralHovered(false)}
                    >
                      <Upload size={14} style={{ marginRight: '8px' }} />
                      Choose Images
                    </button>
                    <input id="general-upload" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload('general', e.target.files)} />
                  </div>

                  <div style={{ backgroundColor: 'rgba(72, 187, 120, 0.05)', borderRadius: '8px', padding: '12px' }}>
                    <p style={styles.tipText}>
                      <strong>Tip:</strong> For best results, capture images in good lighting conditions. 
                      Include multiple angles for comprehensive analysis.
                    </p>
                  </div>
                </div>
            </div>

            {/* Disease Identification Card */}
            <div style={{...styles.card, borderLeft: '4px solid #F56565'}}>
                {/* Card Header */}
                <div style={{ padding: '24px 24px 16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(245, 101, 101, 0.1)', padding: '12px', borderRadius: '9999px' }}>
                      <AlertTriangle size={24} color="#F56565" />
                    </div>
                    <div>
                      <h3 style={styles.cardTitle}>Disease Detection</h3>
                      <p style={styles.cardDescription}>Close-up analysis of infected areas</p>
                    </div>
                  </div>
                </div>
                
                {/* Card Content */}
                <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <p style={styles.cardParagraph}>
                      Upload close-up images of suspected disease symptoms, discolored leaves, or infected areas 
                      for accurate disease identification and treatment recommendations.
                    </p>
                    
                    <div style={styles.bulletGrid}>
                      <div style={styles.bulletItem}><div style={{...styles.bulletDot, backgroundColor: '#F56565'}}></div>Disease identification</div>
                      <div style={styles.bulletItem}><div style={{...styles.bulletDot, backgroundColor: '#F56565'}}></div>Treatment recommendations</div>
                      <div style={styles.bulletItem}><div style={{...styles.bulletDot, backgroundColor: '#F56565'}}></div>Severity assessment</div>
                      <div style={styles.bulletItem}><div style={{...styles.bulletDot, backgroundColor: '#F56565'}}></div>Prevention strategies</div>
                    </div>
                  </div>

                  <div style={{...styles.uploadBox, border: '2px dashed rgba(245, 101, 101, 0.4)'}}>
                    <Scan size={40} color="rgba(245, 101, 101, 0.6)" style={{ marginBottom: '12px' }}/>
                    <p style={{ fontSize: '12px', color: '#A0AEC0', marginBottom: '12px' }}>
                      {selectedFiles.disease?.length > 0 
                        ? `${selectedFiles.disease.length} image(s) selected` 
                        : "Upload close-up images of affected areas"}
                    </p>
                    <button 
                      style={{ ...styles.baseButton, ...styles.diseaseButton, ...(isDiseaseHovered ? styles.diseaseButtonHover : {}) }}
                      onClick={() => triggerFileInput('disease-upload')}
                      onMouseEnter={() => setDiseaseHovered(true)}
                      onMouseLeave={() => setDiseaseHovered(false)}
                    >
                      <Upload size={14} style={{ marginRight: '8px' }} />
                      Upload Images
                    </button>
                    <input id="disease-upload" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload('disease', e.target.files)} />
                  </div>

                  <div style={{ backgroundColor: 'rgba(245, 101, 101, 0.05)', borderRadius: '8px', padding: '12px' }}>
                    <p style={styles.tipText}>
                      <strong>Important:</strong> Focus on affected leaves, stems, or fruits. 
                      Clear, well-lit close-ups provide the most accurate diagnosis.
                    </p>
                  </div>
                </div>
            </div>
          </div>

          {/* Analysis Button */}
          {(selectedFiles.general?.length > 0 || selectedFiles.disease?.length > 0) && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button 
                style={{
                    ...styles.baseButton,
                    ...styles.startButton,
                    ...(isStartHovered ? styles.startButtonHover : {})
                }}
                onClick={() => {
                  toast({
                    title: "Analysis Started",
                    description: "Your images are being processed. Results will be available shortly.",
                  });
                  onBothUploadedChange?.(true);
                  setCrop?.("Thale Cress");
                  setIsOpen(false);
                }}
                onMouseEnter={() => setStartHovered(true)}
                onMouseLeave={() => setStartHovered(false)}
              >
                <Scan size={18} style={{ marginRight: '8px' }} />
                Start AI Analysis
              </button>
            </div>
          )}
      </CustomDialog>
    </>
  );
};

// --- STYLES OBJECT ---
// All styles are defined here to keep the JSX clean and organized.
const styles: { [key: string]: React.CSSProperties } = {
  dialogOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  dialogContent: {
    position: 'relative',
    backgroundColor: '#1A202C',
    color: '#FFFFFF',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '1100px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: '24px',
  },
  card: {
    backgroundColor: '#2D3748',
    borderRadius: '12px',
    transition: 'box-shadow 0.3s ease',
  },
  cardTitle: {
    fontSize: '1.25rem',
    color: '#FFFFFF',
    fontWeight: 600,
  },
  cardDescription: {
    fontSize: '0.875rem',
    color: '#A0AEC0',
  },
  cardParagraph: {
    color: '#A0AEC0',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    marginBottom: '12px'
  },
  bulletGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    fontSize: '12px',
    color: '#FFFFFF',
  },
  bulletItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bulletDot: {
    width: '6px',
    height: '6px',
    borderRadius: '9999px',
  },
  uploadBox: {
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    fontSize: '12px',
    color: '#A0AEC0'
  },
  baseButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, background 0.2s ease, opacity 0.2s ease',
  },
  generalButton: {
    backgroundColor: '#48BB78',
    color: '#FFFFFF',
    padding: '6px 12px',
    fontSize: '14px',
  },
  generalButtonHover: {
    opacity: 0.9,
  },
  diseaseButton: {
    backgroundColor: '#F56565',
    color: '#FFFFFF',
    padding: '6px 12px',
    fontSize: '14px',
  },
  diseaseButtonHover: {
    opacity: 0.9,
  },
  startButton: {
    padding: '12px 32px',
    fontSize: '1rem',
    color: '#FFFFFF',
    background: 'linear-gradient(to right, #68D391, #48BB78)', // Green gradient
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
  },
  startButtonHover: {
    opacity: 0.9,
  },
  triggerButton: {
    padding: '8px 24px',
    fontSize: '1rem',
    color: '#FFFFFF',
    background: 'linear-gradient(to right, #48BB78, #38A169)', // Primary to Secondary
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    transform: 'scale(1)',
    transition: 'all 0.3s ease',
  },
  triggerButtonHover: {
    transform: 'scale(1.01)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
  },
  pulseDot: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '10px',
    height: '10px',
    backgroundColor: '#F56565',
    borderRadius: '9999px',
    animation: 'pulse 1.5s infinite',
  },
};

// Add keyframes for the pulsing animation
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
}
`;
document.head.appendChild(styleSheet);


export default ImageUpload;