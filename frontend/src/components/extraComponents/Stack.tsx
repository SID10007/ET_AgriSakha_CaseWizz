import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";
import "./Stack.css";

interface CardRotateProps {
  children: React.ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
}

function CardRotate({ children, onSendToBack, sensitivity }: CardRotateProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);

  function handleDragEnd(_: never, info: { offset: { x: number; y: number } }) {
    if (
      Math.abs(info.offset.x) > sensitivity ||
      Math.abs(info.offset.y) > sensitivity
    ) {
      onSendToBack();
    } else {
      x.set(0);
      y.set(0);
    }
  }

  return (
    <motion.div
      className="card-rotate"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
}

interface CardContent {
  id: number;
  title: string;
  description: string;
  backgroundColor: string;
  textColor: string;
}

interface StackProps {
  randomRotation?: boolean;
  sensitivity?: number;
  cardDimensions?: { width: number; height: number };
  sendToBackOnClick?: boolean;
  cardsData?: CardContent[];
  animationConfig?: { stiffness: number; damping: number };
  decodedLanguage?: string;
}

export default function Stack({
  randomRotation = false,
  sensitivity = 200,
  cardDimensions = { width: 358, height: 508 },
  cardsData = [],
  animationConfig = { stiffness: 260, damping: 20 },
  sendToBackOnClick = false,
  decodedLanguage
}: StackProps) {
  const [cards, setCards] = useState(
    cardsData.length
      ? cardsData
      : [
          {
            id: 1,
            title: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            titleh: "प्रधान मंत्री फसल बीमा योजना (PMFBY)",
            description: " PMFBY is a government-backed crop insurance scheme in India that provides financial support to farmers in case of crop loss due to natural calamities like floods, droughts, pest attacks, and diseases. Under PMFBY, farmers pay a nominal premium (usually 1.5% to 5% of the insured value), and the government covers the rest of the premium. The scheme ensures that farmers receive compensation for yield losses, helping them recover from setbacks and reducing their financial burden.",
            descriptionh: " PMFBY भारत में सरकार द्वारा समर्थित फसल बीमा योजना है जो बाढ़, सूखे, कीट हमलों और बीमारियों जैसी प्राकृतिक आपदाओं के कारण फसल के नुकसान की स्थिति में किसानों को वित्तीय सहायता प्रदान करती है। PMFBY के तहत, किसान एक मामूली प्रीमियम (आमतौर पर बीमित मूल्य का 1.5% से 5%) का भुगतान करते हैं, और बाकी प्रीमियम सरकार द्वारा कवर किया जाता है। यह योजना सुनिश्चित करती है कि किसानों को उपज के नुकसान के लिए मुआवजा मिले, जिससे उन्हें झटकों से उबरने और उनके वित्तीय बोझ को कम करने में मदद मिले।",
            backgroundColor: "#fccd03",
            textColor: "#000000"
          },
          {
            id: 2,
            title: "Kisan Credit Card (KCC)",
            titleh: "किसान क्रेडिट कार्ड (KCC)",
            description: "The Kisan Credit Card is a financial product designed to provide short-term credit to farmers at low interest rates for agricultural activities such as buying seeds, fertilizers, and machinery or covering expenses during the sowing season. The KCC allows farmers to withdraw money as needed and repay it after the harvest. It also provides coverage for risks like crop failure or damage due to natural disasters. The card comes with flexible repayment options and interest subvention (government-sponsored reduction of interest rates)",
            descriptionh: "किसान क्रेडिट कार्ड एक वित्तीय उत्पाद है जिसे किसानों को बीज, उर्वरक और मशीनरी खरीदने या बुवाई के मौसम के दौरान खर्चों को कवर करने जैसी कृषि गतिविधियों के लिए कम ब्याज दरों पर अल्पकालिक ऋण प्रदान करने के लिए डिज़ाइन किया गया है। KCC किसानों को आवश्यकतानुसार पैसे निकालने और फसल के बाद इसे चुकाने की अनुमति देता है। यह प्राकृतिक आपदाओं के कारण फसल की विफलता या क्षति जैसे जोखिमों के लिए कवरेज भी प्रदान करता है। कार्ड लचीले पुनर्भुगतान विकल्पों और ब्याज सबवेंशन (सरकार द्वारा प्रायोजित ब्याज दरों में कमी) के साथ आता है।",
            backgroundColor: "#fccd03",
            textColor: "#000000"
          },
          {
            id: 3,
            title: "Minimum Support Price (MSP)",
            titleh: "न्यूनतम समर्थन मूल्य (MSP)",
            description: "MSP is the price at which the government guarantees to purchase certain crops from farmers, ensuring that they receive a minimum income regardless of market fluctuations. The MSP acts as a safety net to protect farmers from sharp price drops due to market instability or excess supply. It is announced annually before the sowing season for key crops such as wheat, rice, pulses, and oilseeds. MSP helps farmers make planting decisions based on guaranteed returns, reducing the financial risks associated with price volatility",
            descriptionh: "MSP वह मूल्य है जिस पर सरकार किसानों से कुछ फसलों को खरीदने की गारंटी देती है, यह सुनिश्चित करते हुए कि उन्हें बाजार में उतार-चढ़ाव की परवाह किए बिना न्यूनतम आय प्राप्त हो। MSP बाजार अस्थिरता या अत्यधिक आपूर्ति के कारण कीमतों में तेज गिरावट से किसानों की रक्षा के लिए एक सुरक्षा जाल के रूप में कार्य करता है। इसकी घोषणा वार्षिक रूप से गेहूं, चावल, दालें और तिलहन जैसी प्रमुख फसलों के लिए बुवाई के मौसम से पहले की जाती है। MSP किसानों को गारंटीकृत रिटर्न के आधार पर रोपण निर्णय लेने में मदद करता है, जिससे मूल्य अस्थिरता से जुड़े वित्तीय जोखिम कम होते हैं।",
            backgroundColor: "#fccd03",
            textColor: "#000000"
          },
          {
            id: 4,
            title: "NABARD Schemes",
            titleh: "नाबार्ड योजनाएँ",
            description: "NABARD is a financial institution that provides long-term and short-term loans, infrastructure funding, and financial support for rural and agricultural development in India. NABARD offers various schemes like the Rural Infrastructure Development Fund (RIDF) and Self Help Group (SHG)–Bank Linkage Programme to empower farmers and rural communities. It also provides financial assistance for farm mechanization, irrigation projects, and post-harvest infrastructure to increase agricultural productivity and rural livelihoods.",
            descriptionh: "नाबार्ड एक वित्तीय संस्थान है जो भारत में ग्रामीण और कृषि विकास के लिए दीर्घकालिक और अल्पकालिक ऋण, बुनियादी ढांचा वित्तपोषण और वित्तीय सहायता प्रदान करता है। नाबार्ड किसानों और ग्रामीण समुदायों को सशक्त बनाने के लिए ग्रामीण अवसंरचना विकास निधि (RIDF) और स्वयं सहायता समूह (SHG) – बैंक लिंकेज कार्यक्रम जैसी विभिन्न योजनाएँ प्रदान करता है। यह कृषि उत्पादकता और ग्रामीण आजीविका को बढ़ाने के लिए कृषि मशीनीकरण, सिंचाई परियोजनाओं और फसल कटाई के बाद के बुनियादी ढांचे के लिए वित्तीय सहायता भी प्रदान करता है।",
            backgroundColor: "#fccd03",
            textColor: "#000000"
          },
          {
            id: 5,
            title: "Farmer Producer Organization (FPO)",
            titleh: "किसान उत्पादक संगठन (FPO)",
            description: "FPOs are cooperative groups formed by small and marginal farmers to collectively produce, market, and sell their crops. By working together, farmers in an FPO can access better quality seeds, fertilizers, and machinery at lower prices through collective bargaining. FPOs also help farmers get better market access and reduce dependency on middlemen, ensuring that farmers receive higher profits. The government supports FPOs through financial grants, training, and market access to enhance their bargaining power and profitability.",
            descriptionh: "FPO छोटे और सीमांत किसानों द्वारा सामूहिक रूप से अपनी फसलों का उत्पादन, विपणन और बिक्री करने के लिए बनाए गए सहकारी समूह हैं। एक साथ काम करके, एक FPO में किसान सामूहिक सौदेबाजी के माध्यम से बेहतर गुणवत्ता वाले बीज, उर्वरक और मशीनरी कम कीमतों पर प्राप्त कर सकते हैं। FPO किसानों को बेहतर बाजार पहुंच प्राप्त करने और बिचौलियों पर निर्भरता कम करने में भी मदद करते हैं, यह सुनिश्चित करते हुए कि किसानों को अधिक लाभ मिले। सरकार FPO को उनकी सौदेबाजी की शक्ति और लाभप्रदता को बढ़ाने के लिए वित्तीय अनुदान, प्रशिक्षण और बाजार पहुंच के माध्यम से समर्थन करती है।",
            backgroundColor: "#fccd03",
            textColor: "#000000"
          }
        ]
  );

  const sendToBack = (id: number) => {
    setCards((prev) => {
      const newCards = [...prev];
      const index = newCards.findIndex((card) => card.id === id);
      const [card] = newCards.splice(index, 1);
      newCards.unshift(card);
      return newCards;
    });
  };

  return (
    <div
      className="stack-container"
      style={{
        width: cardDimensions.width,
        height: cardDimensions.height,
        perspective: 600,
      }}
    >
      {/* {cards.map((card, index) => {
        const randomRotate = randomRotation
          ? Math.random() * 10 - 5 // Random degree between -5 and 5
          : 0;
        return (
          <CardRotate
            key={card.id}
            onSendToBack={() => sendToBack(card.id)}
            sensitivity={sensitivity}
          >
            <motion.div
              className="card"
              onClick={() => sendToBackOnClick && sendToBack(card.id)}
              animate={{
                rotateZ: (cards.length - index - 1) * 4 + randomRotate,
                scale: 1 + index * 0.06 - cards.length * 0.06,
                transformOrigin: "90% 90%",
              }}
              initial={false}
              transition={{
                type: "spring",
                stiffness: animationConfig.stiffness,
                damping: animationConfig.damping,
              }}
              style={{
                width: cardDimensions.width,
                height: cardDimensions.height,
                backgroundColor: card.backgroundColor,
                color: card.textColor,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "16px",
                borderRadius: "12px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                overflow: "hidden",
                position: "relative"
              }}
            >
              <h2 style={{ 
                margin: "0 0 12px 0", 
                fontSize: "30px", // Increased font size
                fontWeight: "bold",
                textAlign: "center"
              }}>
                {card.title}
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: "16px", // Increased font size
                textAlign: "center",
                lineHeight: "1.5" // Added line height for better readability
              }}>
                {card.description}
              </p>
            </motion.div>
          </CardRotate>
        );
      })} */}
      {decodedLanguage === 'en' ? 
      cards.map((card, index) => {
        const randomRotate = randomRotation
          ? Math.random() * 10 - 5 // Random degree between -5 and 5
          : 0;
        return (
          <CardRotate
            key={card.id}
            onSendToBack={() => sendToBack(card.id)}
            sensitivity={sensitivity}
          >
            <motion.div
              className="card"
              onClick={() => sendToBackOnClick && sendToBack(card.id)}
              animate={{
                rotateZ: (cards.length - index - 1) * 4 + randomRotate,
                scale: 1 + index * 0.06 - cards.length * 0.06,
                transformOrigin: "90% 90%",
              }}
              initial={false}
              transition={{
                type: "spring",
                stiffness: animationConfig.stiffness,
                damping: animationConfig.damping,
              }}
              style={{
                width: cardDimensions.width,
                height: cardDimensions.height,
                backgroundColor: card.backgroundColor,
                color: card.textColor,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "16px",
                borderRadius: "12px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                overflow: "hidden",
                position: "relative"
              }}
            >
              <h2 style={{ 
                margin: "0 0 12px 0", 
                fontSize: "30px", // Increased font size
                fontWeight: "bold",
                textAlign: "center"
              }}>
                {card.title}
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: "16px", // Increased font size
                textAlign: "center",
                lineHeight: "1.5" // Added line height for better readability
              }}>
                {card.description}
              </p>
            </motion.div>
          </CardRotate>
        );
      })
      :
      cards.map((card, index) => {
        const randomRotate = randomRotation
          ? Math.random() * 10 - 5 // Random degree between -5 and 5
          : 0;
        return (
          <CardRotate
            key={card.id}
            onSendToBack={() => sendToBack(card.id)}
            sensitivity={sensitivity}
          >
            <motion.div
              className="card"
              onClick={() => sendToBackOnClick && sendToBack(card.id)}
              animate={{
                rotateZ: (cards.length - index - 1) * 4 + randomRotate,
                scale: 1 + index * 0.06 - cards.length * 0.06,
                transformOrigin: "90% 90%",
              }}
              initial={false}
              transition={{
                type: "spring",
                stiffness: animationConfig.stiffness,
                damping: animationConfig.damping,
              }}
              style={{
                width: cardDimensions.width,
                height: cardDimensions.height,
                backgroundColor: card.backgroundColor,
                color: card.textColor,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "16px",
                borderRadius: "12px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                overflow: "hidden",
                position: "relative"
              }}
            >
              <h2 style={{ 
                margin: "0 0 12px 0", 
                fontSize: "30px", // Increased font size
                fontWeight: "bold",
                textAlign: "center"
              }}>
                {card.titleh}
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: "16px", // Increased font size
                textAlign: "center",
                lineHeight: "1.5" // Added line height for better readability
              }}>
                {card.descriptionh}
              </p>
            </motion.div>
          </CardRotate>
        );
      })
      }
    </div>
  );
}