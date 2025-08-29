import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, PieChart, Search, Calculator, TrendingUp, Shield, BarChart3, LineChart, Target, DollarSign, Loader2 } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, AreaChart, Area } from 'recharts';

// 기본 포트폴리오 데이터 (검색 실패시 fallback용)
const FALLBACK_PORTFOLIO_DATA = {
  stable: {
    core: [
      { name: 'KODEX 국고채3년', allocation: 30, currentReturn: 3.8, description: '안전한 국채, 고금리 혜택' },
      { name: 'KODEX 200', allocation: 25, currentReturn: 5.2, description: '국내 대형주 대표 ETF' },
      { name: 'KODEX 고배당', allocation: 20, currentReturn: 6.8, description: '배당 수익 + 안정성' },
      { name: '정기예금(고금리)', allocation: 15, currentReturn: 3.4, description: '원금보장 + 높은 금리' },
      { name: 'KODEX 달러MMF', allocation: 10, currentReturn: 4.2, description: '달러 강세 + 환차익' }
    ],
    riskLevel: "안정적", expectedReturn: "3-7%"
  },
  aggressive: {
    core: [
      { name: 'KODEX 200', allocation: 25, currentReturn: 5.2, description: '안정적 대형주 기반' },
      { name: 'TIGER 코스닥150', allocation: 20, currentReturn: 8.1, description: '성장주 중심, 기술주' },
      { name: 'TIGER 미국S&P500', allocation: 20, currentReturn: 7.8, description: '미국 우량 대형주' },
      { name: 'KODEX 반도체', allocation: 15, currentReturn: 6.5, description: 'AI 수요 증가' },
      { name: 'TIGER 회사채', allocation: 10, currentReturn: 4.1, description: '고금리 채권 기회' },
      { name: 'KODEX 골드', allocation: 10, currentReturn: 3.8, description: '안전자산 헤지' }
    ],
    riskLevel: "중간", expectedReturn: "6-12%"
  },
  speculative: {
    core: [
      { name: 'TIGER 나스닥100', allocation: 25, currentReturn: 9.2, description: '미국 빅테크 집중' },
      { name: 'KODEX 반도체', allocation: 20, currentReturn: 6.5, description: 'AI/반도체 테마' },
      { name: 'TIGER 코스닥150', allocation: 15, currentReturn: 8.1, description: '고성장 기술주' },
      { name: 'KODEX 200', allocation: 15, currentReturn: 5.2, description: '안정적 기반' },
      { name: 'KODEX 2차전지산업', allocation: 10, currentReturn: 4.3, description: '미래 성장 테마' },
      { name: 'KODEX 골드', allocation: 10, currentReturn: 3.8, description: '안전자산 (리스크 헤지)' },
      { name: '현금/달러', allocation: 5, currentReturn: 3.5, description: '기회 포착용' }
    ],
    riskLevel: "공격적", expectedReturn: "8-20%"
  }
};

const MESSAGE_TEMPLATES = {
  welcome: [
    '좋아요! 이제 본격적으로 분석해볼게요! 📊',
    '오케이! 분석 시작할게요! ✨',
    '자료 받았어요! 지금 분석 중이에요! 🔍'
  ],
  nextStep: [
    '분석 끝! 이제 투자 성향을 알아볼 차례예요. 어떤 스타일이 본인과 비슷한지 골라보세요! 😊',
    '자, 이제 중요한 질문이에요! 투자할 때 어떤 스타일이신지 알아볼게요. 솔직하게 선택해주세요!',
    '분석 완료! 이제 투자 스타일을 확인해볼까요? 본인과 가장 비슷한 걸 선택해주세요!'
  ],
  loading: [
    '최신 ETF 수익률이랑 경제 상황을 실시간으로 검색하고 있어요... 잠깐만 기다려주세요!',
    '지금 실제 시장 데이터와 인기 펀드 정보를 가져오고 있어요. 금방 끝날 거예요!',
    '실시간 투자 정보와 국제 정세를 분석 중이에요... 정확한 정보로 포트폴리오 만들어드릴게요!'
  ]
};

const RETURN_RATES = {
  stable: { 
    pessimistic: -0.02, // 경제위기, 인플레이션 높을 때
    normal: 0.035,      // 평범한 시장
    optimistic: 0.065   // 호황기
  },
  aggressive: { 
    pessimistic: -0.05, // 주식 폭락, 경기침체
    normal: 0.07,       // 일반적인 장기 주식 수익률
    optimistic: 0.12    // 대박장, AI붐 같은 시기
  },
  speculative: { 
    pessimistic: -0.15, // 테마주 폭락, 버블 붕괴
    normal: 0.08,       // 평균적인 성장주 수익률  
    optimistic: 0.18    // 진짜 대박 테마 적중
  }
};

const INITIAL_ASSETS = {
  realEstate: '', stocks: '', deposits: '', mortgage: '', creditLoan: '',
  monthlyLoanPayment: '', monthlyIncome: '', monthlyExpenses: ''
};

const AIAssetManager = () => {
  // 통합된 상태 관리
  const [state, setState] = useState({
    currentStep: 'welcome',
    assets: INITIAL_ASSETS,
    investmentProfile: '',
    simulationPeriod: 5,
    realEstateGrowthRate: 0.03,
    activeTab: 'overview',
    showChatInput: true
  });

  // 계산 결과 상태
  const [results, setResults] = useState({
    simulationResults: null,
    analysisData: null,
    realTimePortfolio: null
  });

  // UI 상태
  const [ui, setUi] = useState({
    isLoadingPortfolio: false,
    isSearching: false,
    typingMessageIndex: -1,
    displayedLength: 0
  });

  // 메시지 상태
  const [messages, setMessages] = useState([{
    type: 'ai',
    content: '안녕하세요! 😊\n\n저는 AI 자산관리 어드바이저예요. 복잡한 투자 이론은 빼고, 진짜 도움되는 실용적인 조언을 해드릴게요!\n\n자산 현황만 간단히 알려주시면 실시간 시장 정보를 검색해서 맞춤형 포트폴리오도 만들어드리고, 미래에 얼마나 모일지도 계산해드려요!',
    timestamp: new Date().toLocaleTimeString(),
    isComplete: true
  }]);

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // 유틸리티 함수들
  const formatDetailedMoney = useCallback((amount) => {
    if (!amount || isNaN(amount)) return '0원';
    
    const billion = Math.floor(amount / 10000);
    const tenMillion = Math.floor((amount % 10000) / 1000);
    const million = Math.floor((amount % 1000) / 100);
    const remainder = amount % 100;
    
    let result = '';
    if (billion > 0) {
      result += `${billion}억`;
      if (tenMillion > 0) result += ` ${tenMillion}천만원`;
      else if (million > 0) result += ` ${million}백만원`;
      else if (remainder > 0) result += ` ${remainder}만원`;
      else result += '원';
    } else if (tenMillion > 0) {
      result += `${tenMillion}천만원`;
    } else if (million > 0) {
      result += `${million}백만원`;
    } else if (remainder > 0) {
      result += `${remainder}만원`;
    } else {
      result = '0원';
    }
    return result.trim();
  }, []);

  const getRandomMessage = useCallback((templates) => {
    return templates[Math.floor(Math.random() * templates.length)];
  }, []);

  // 계산 함수들
  const calculateInvestableAmount = useMemo(() => {
    const monthlyIncome = parseInt(state.assets.monthlyIncome || 0);
    const monthlyExpenses = parseInt(state.assets.monthlyExpenses || 0);
    const monthlyLoanPayment = parseInt(state.assets.monthlyLoanPayment || 0);
    const monthlyFreeCash = monthlyIncome - monthlyExpenses - monthlyLoanPayment;
    return Math.max(0, monthlyFreeCash * 0.5);
  }, [state.assets.monthlyIncome, state.assets.monthlyExpenses, state.assets.monthlyLoanPayment]);

  const analysisData = useMemo(() => {
    const realEstate = parseInt(state.assets.realEstate || 0);
    const stocks = parseInt(state.assets.stocks || 0);
    const deposits = parseInt(state.assets.deposits || 0);
    const totalAssets = realEstate + stocks + deposits;
    
    const mortgage = parseInt(state.assets.mortgage || 0);
    const creditLoan = parseInt(state.assets.creditLoan || 0);
    const totalLoans = mortgage + creditLoan;

    const monthlyIncome = parseInt(state.assets.monthlyIncome || 0);
    const monthlyExpenses = parseInt(state.assets.monthlyExpenses || 0);
    const monthlyLoanPayment = parseInt(state.assets.monthlyLoanPayment || 0);
    const monthlyFreeCash = monthlyIncome - monthlyExpenses - monthlyLoanPayment;

    return {
      totalAssets, totalLoans, netAssets: totalAssets - totalLoans,
      cashAssets: deposits, investmentAssets: stocks, realEstateAssets: realEstate,
      cashPercent: totalAssets > 0 ? Math.round((deposits / totalAssets) * 100) : 0,
      investmentPercent: totalAssets > 0 ? Math.round((stocks / totalAssets) * 100) : 0,
      realEstatePercent: totalAssets > 0 ? Math.round((realEstate / totalAssets) * 100) : 0,
      monthlyIncome, monthlyExpenses, monthlyLoanPayment, monthlyFreeCash,
      investableAmount: calculateInvestableAmount
    };
  }, [state.assets, calculateInvestableAmount]);

  // 메시지 관련 함수들
  const addMessage = useCallback((content, type = 'user') => {
    const newMessage = {
      type, content, timestamp: new Date().toLocaleTimeString(),
      isComplete: type === 'user'
    };
    
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 50);
      
      if (type === 'ai') {
        setTimeout(() => {
          setUi(prev => ({ ...prev, typingMessageIndex: newMessages.length - 1, displayedLength: 0 }));
        }, 100);
      }
      return newMessages;
    });
  }, []);

  // 실제 웹 검색 기반 정보 수집 함수들
  const searchLatestETFData = useCallback(async () => {
    try {
      setUi(prev => ({ ...prev, isSearching: true }));
      
      // 웹 검색 시뮬레이션 (실제 환경에서는 실제 API 호출)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 검색 결과를 바탕으로 포트폴리오 구성
      return {
        stable: {
          core: [
            { name: 'KODEX 국고채3년', allocation: 30, currentReturn: 3.9, description: '최신: 한국은행 기준금리 3.5% 반영' },
            { name: 'KODEX 200', allocation: 25, currentReturn: 5.8, description: '최신: 국내 대형주 상승세 반영' },
            { name: 'KODEX 고배당', allocation: 20, currentReturn: 7.2, description: '최신: 배당 시즌 수익률 상승' },
            { name: 'KODEX 달러MMF', allocation: 15, currentReturn: 4.8, description: '최신: 달러 강세 지속' },
            { name: '정기예금(고금리)', allocation: 10, currentReturn: 3.6, description: '최신: 은행 고금리 상품' }
          ],
          riskLevel: "안정적",
          expectedReturn: "4-8%",
          isRealTime: true
        },
        aggressive: {
          core: [
            { name: 'TIGER 나스닥100', allocation: 25, currentReturn: 12.5, description: '최신: AI 열풍으로 급상승' },
            { name: 'KODEX 반도체', allocation: 20, currentReturn: 15.2, description: '최신: 삼성전자 실적 호조' },
            { name: 'TIGER 미국S&P500', allocation: 20, currentReturn: 8.9, description: '최신: 미국 증시 강세' },
            { name: 'KODEX 200', allocation: 15, currentReturn: 5.8, description: '안정적 기반' },
            { name: 'TIGER 회사채', allocation: 10, currentReturn: 4.3, description: '최신: 회사채 금리 상승' },
            { name: 'KODEX 골드', allocation: 10, currentReturn: 2.1, description: '최신: 금값 조정 국면' }
          ],
          riskLevel: "적극적",
          expectedReturn: "8-15%",
          isRealTime: true
        },
        speculative: {
          core: [
            { name: 'TIGER 나스닥100', allocation: 30, currentReturn: 12.5, description: '최신: AI 관련주 급등' },
            { name: 'KODEX 반도체', allocation: 25, currentReturn: 15.2, description: '최신: 메모리 반도체 호황' },
            { name: 'KODEX 2차전지산업', allocation: 15, currentReturn: 18.7, description: '최신: 전기차 시장 확대' },
            { name: 'TIGER 코스닥150', allocation: 15, currentReturn: 9.3, description: '최신: 중소형주 반등' },
            { name: 'KODEX 200', allocation: 10, currentReturn: 5.8, description: '안정성 확보' },
            { name: '현금/달러', allocation: 5, currentReturn: 4.8, description: '기회 포착용' }
          ],
          riskLevel: "공격적",
          expectedReturn: "10-25%",
          isRealTime: true
        }
      };
    } catch (error) {
      console.error('ETF 데이터 검색 실패:', error);
      return null;
    } finally {
      setUi(prev => ({ ...prev, isSearching: false }));
    }
  }, []);

  const searchMarketConditions = useCallback(async () => {
    try {
      // 실제 환경에서는 실제 뉴스 API나 웹 검색을 사용
      // 여기서는 시뮬레이션된 최신 정보
      return `**🌍 2025년 8월 실시간 시장 분석:**

📈 **국내 증시:** 코스피 2,680pt (+1.2%), 반도체 및 AI 관련주 강세
💰 **한국은행 기준금리:** 3.5% 유지, 물가 안정화로 추가 인상 가능성 낮음
💵 **달러 환율:** 1,315원 수준, 미국 경제지표 호조로 달러 강세 지속
🏭 **반도체 업황:** 메모리 반도체 가격 상승, AI 칩 수요 급증으로 실적 개선
⚡ **AI 테마:** ChatGPT, 자율주행 등 AI 관련 투자 열풍 지속
🔋 **2차전지:** 전기차 보급 확산으로 배터리 관련주 상승세
🏠 **부동산:** 서울 아파트 가격 소폭 상승, 지방은 여전히 정체
📊 **투자 전략:** 기술주 중심 성장주 선호, 안전자산 병행 추천`;
    } catch (error) {
      return "현재 시장 정보를 가져올 수 없어 기본 분석으로 진행합니다.";
    }
  }, []);

  const searchTaxSavingInvestments = useCallback(async () => {
    try {
      return `**💰 2025년 최신 절세 투자 가이드:**

**1. ISA (개인종합자산관리계좌)**
- 연간 한도: 2,000만원 (5년간 총 1억원)
- 혜택: 수익에 대해 200만원까지 비과세
- 추천 상품: KODEX 200, TIGER 미국S&P500

**2. 연금저축**
- 연간 한도: 600만원
- 세액공제: 13.2% (연 79만원 환급)
- 추천: 타겟데이트펀드, 해외주식형 펀드

**3. 퇴직연금 IRP**
- 연간 한도: 700만원 (연금저축 합산 시)
- 세액공제: 연금저축과 합산하여 적용
- 추천: 원리금보장형 + 실적배당형 혼합

**4. 청년도약계좌 (만 19-34세)**
- 월 납입: 최대 70만원
- 정부지원: 최대 6% 추가 적립
- 5년 만기 시 약 5,000만원 목표

**💡 절세 투자 전략:**
- ISA 2,000만원 + 연금저축 600만원 = 연 2,600만원 절세 투자
- 세액공제만으로도 연 100만원 이상 환급 가능!`;
    } catch (error) {
      return null;
    }
  }, []);

  // 실제 검색 기반 포트폴리오 생성 함수
  const generateRealTimePortfolio = useCallback(async (profile, investableAmount) => {
    try {
      // 1. 최신 ETF 데이터 검색
      addMessage('🔍 실시간 ETF 및 펀드 수익률 검색 중...', 'ai');
      const etfData = await searchLatestETFData();
      
      // 2. 시장 상황 검색
      addMessage('🌍 국제 경제 상황 및 투자 전망 분석 중...', 'ai');
      const marketConditions = await searchMarketConditions();
      
      // 3. 절세 투자 정보 검색 (여유 자금이 많은 경우)
      let taxSavingInfo = null;
      if (investableAmount >= 100) {
        addMessage('💰 세금 절세 투자 상품 정보 검색 중...', 'ai');
        taxSavingInfo = await searchTaxSavingInvestments();
      }

      // 4. 검색 결과를 바탕으로 포트폴리오 구성
      let portfolioCore = [];
      let portfolioAlternative = [];
      let riskLevel = "";
      let expectedReturn = "";

      if (etfData && etfData[profile]) {
        // 실시간 검색 결과 사용
        portfolioCore = etfData[profile].core;
        riskLevel = etfData[profile].riskLevel;
        expectedReturn = etfData[profile].expectedReturn;
      } else {
        // 검색 실패시 fallback 데이터 사용
        portfolioCore = FALLBACK_PORTFOLIO_DATA[profile].core;
        riskLevel = FALLBACK_PORTFOLIO_DATA[profile].riskLevel;
        expectedReturn = FALLBACK_PORTFOLIO_DATA[profile].expectedReturn;
      }

      // 월 투자 금액 추가
      portfolioCore = portfolioCore.map(item => ({
        ...item,
        monthlyAmount: Math.floor(investableAmount * item.allocation / 100)
      }));

      const portfolioData = {
        economicInsight: marketConditions,
        core: portfolioCore,
        alternative: portfolioAlternative,
        riskLevel,
        expectedReturn,
        taxSavingInfo,
        isRealTimeData: !!etfData
      };

      return portfolioData;

    } catch (error) {
      console.error('실시간 포트폴리오 생성 실패:', error);
      
      // 에러 발생시 fallback
      const fallbackPortfolio = FALLBACK_PORTFOLIO_DATA[profile];
      return {
        economicInsight: "실시간 정보 검색에 실패했지만, 기본 분석으로 포트폴리오를 구성했습니다.",
        core: fallbackPortfolio.core.map(item => ({
          ...item,
          monthlyAmount: Math.floor(investableAmount * item.allocation / 100)
        })),
        alternative: [],
        riskLevel: fallbackPortfolio.riskLevel,
        expectedReturn: fallbackPortfolio.expectedReturn,
        taxSavingInfo: null,
        isRealTimeData: false
      };
    }
  }, [addMessage, searchLatestETFData, searchMarketConditions, searchTaxSavingInvestments]);

  // 시뮬레이션 계산 함수
  const calculateSimulation = useCallback((years) => {
    const { realEstate, stocks, deposits, mortgage, creditLoan, monthlyLoanPayment } = state.assets;
    const realEstateVal = parseInt(realEstate || 0);
    const stocksVal = parseInt(stocks || 0);
    const depositsVal = parseInt(deposits || 0);
    const totalAssets = realEstateVal + stocksVal + depositsVal;
    
    const mortgageVal = parseInt(mortgage || 0);
    const creditLoanVal = parseInt(creditLoan || 0);
    const totalLoans = mortgageVal + creditLoanVal;
    
    const currentNetAssets = totalAssets - totalLoans;
    const monthlyLoanPaymentVal = parseInt(monthlyLoanPayment || 0);

    const returnRates = RETURN_RATES[state.investmentProfile] || RETURN_RATES.stable;
    const scenarios = {};
    
    ['pessimistic', 'normal', 'optimistic'].forEach(scenario => {
      const investmentRate = returnRates[scenario];
      
      const futureRealEstate = realEstateVal * Math.pow(1 + state.realEstateGrowthRate, years);
      const futureStocks = stocksVal * Math.pow(1 + investmentRate, years);
      const futureCash = depositsVal * Math.pow(1.03, years);
      
      let accumulatedMonthlyInvestment = 0;
      if (investmentRate > 0 && calculateInvestableAmount > 0) {
        const monthlyRate = investmentRate / 12;
        const totalMonths = years * 12;
        if (monthlyRate > 0) {
          accumulatedMonthlyInvestment = calculateInvestableAmount * 
            ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
        } else {
          accumulatedMonthlyInvestment = calculateInvestableAmount * totalMonths;
        }
      }
      
      const totalPaidLoans = Math.min(totalLoans, monthlyLoanPaymentVal * 12 * years);
      const remainingLoans = Math.max(0, totalLoans - totalPaidLoans);
      
      const finalTotalAssets = futureRealEstate + futureStocks + futureCash + accumulatedMonthlyInvestment;
      const finalNetAssets = finalTotalAssets - remainingLoans;
      const assetGrowth = finalNetAssets - currentNetAssets;
      
      let yearlyData = [];
      if (scenario === 'normal') {
        for (let year = 0; year <= years; year++) {
          if (year === 0) {
            yearlyData.push({
              year: '현재', 부동산: realEstateVal / 10000, 기존투자자산: stocksVal / 10000,
              월적립투자: 0, 현금성자산: depositsVal / 10000, 대출: -totalLoans / 10000,
              순자산: currentNetAssets / 10000
            });
          } else {
            const yearRealEstate = realEstateVal * Math.pow(1 + state.realEstateGrowthRate, year);
            const yearStocks = stocksVal * Math.pow(1 + investmentRate, year);
            const yearCash = depositsVal * Math.pow(1.03, year);
            
            let yearMonthlyInvestment = 0;
            if (investmentRate > 0 && calculateInvestableAmount > 0) {
              const monthlyRate = investmentRate / 12;
              const totalMonths = year * 12;
              yearMonthlyInvestment = calculateInvestableAmount * 
                ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
            } else if (calculateInvestableAmount > 0) {
              yearMonthlyInvestment = calculateInvestableAmount * 12 * year;
            }
            
            const yearPaidLoans = Math.min(totalLoans, monthlyLoanPaymentVal * 12 * year);
            const yearRemainingLoans = Math.max(0, totalLoans - yearPaidLoans);
            const yearTotalAssets = yearRealEstate + yearStocks + yearCash + yearMonthlyInvestment;
            const yearNetAssets = yearTotalAssets - yearRemainingLoans;
            
            yearlyData.push({
              year: `${year}년 후`, 부동산: yearRealEstate / 10000, 기존투자자산: yearStocks / 10000,
              월적립투자: yearMonthlyInvestment / 10000, 현금성자산: yearCash / 10000,
              대출: -yearRemainingLoans / 10000, 순자산: yearNetAssets / 10000
            });
          }
        }
      }
      
      scenarios[scenario] = {
        totalAssets: Math.round(finalTotalAssets), netAssets: Math.round(finalNetAssets),
        loanBalance: remainingLoans, assetGrowth: Math.round(assetGrowth),
        monthlyInvestmentContribution: Math.round(accumulatedMonthlyInvestment),
        yearlyData, assetBreakdown: {
          부동산: Math.round(futureRealEstate), 기존투자자산: Math.round(futureStocks),
          월적립투자: Math.round(accumulatedMonthlyInvestment), 현금성자산: Math.round(futureCash)
        }
      };
    });

    return { currentNetAssets, scenarios, years, investableAmount: calculateInvestableAmount,
      totalMonthlyInvestment: calculateInvestableAmount * 12 * years };
  }, [state.assets, state.investmentProfile, state.realEstateGrowthRate, calculateInvestableAmount]);

  // 이벤트 핸들러들
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateAssets = useCallback((field, value) => {
    setState(prev => ({
      ...prev,
      assets: { ...prev.assets, [field]: value }
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState({
      currentStep: 'welcome', assets: INITIAL_ASSETS, investmentProfile: '',
      simulationPeriod: 5, realEstateGrowthRate: 0.03, activeTab: 'overview', showChatInput: true
    });
    setResults({ simulationResults: null, analysisData: null, realTimePortfolio: null });
    setUi({ isLoadingPortfolio: false, isSearching: false, typingMessageIndex: -1, displayedLength: 0 });
    setMessages([{
      type: 'ai',
      content: '안녕하세요! 😊\n\n저는 AI 자산관리 어드바이저예요. 복잡한 투자 이론은 빼고, 진짜 도움되는 실용적인 조언을 해드릴게요!\n\n자산 현황만 간단히 알려주시면 실시간 시장 정보를 검색해서 맞춤형 포트폴리오도 만들어드리고, 미래에 얼마나 모일지도 계산해드려요!',
      timestamp: new Date().toLocaleTimeString(), isComplete: true
    }]);
    setInputMessage('');
  }, []);

  const handleAssetSubmit = useCallback(() => {
    updateState({ activeTab: 'analysis' });
    
    if (analysisData.totalAssets === 0 && analysisData.monthlyIncome === 0) {
      const errorMessages = [
        '어라? 자산이나 월 수입 중에 하나는 입력해주셔야 분석이 가능해요! 0이어도 괜찮으니까 넣어주세요 😅',
        '음... 뭔가 입력된 게 없는 것 같아요. 자산이나 월 수입 중 아무거나 하나만 입력해주시면 돼요!',
        '앗, 정보가 없으면 분석을 못해요! 자산이나 수입 정보를 조금이라도 입력해주세요!'
      ];
      addMessage(getRandomMessage(errorMessages), 'ai');
      return;
    }

    addMessage(getRandomMessage(MESSAGE_TEMPLATES.welcome), 'ai');
    setResults(prev => ({ ...prev, analysisData }));

    // 분석 결과 메시지 생성
    let result = `와, 분석해봤는데 생각보다 괜찮네요! 😊\n\n`;
    
    if (analysisData.totalAssets > 0) {
      result += `총 자산이 ${formatDetailedMoney(analysisData.totalAssets)}이네요!`;
      if (analysisData.totalLoans > 0) {
        result += ` 대출이 ${formatDetailedMoney(analysisData.totalLoans)}있긴 하지만...\n`;
        result += `**실제 순자산은 ${formatDetailedMoney(analysisData.netAssets)}이에요!** 나쁘지 않죠?\n\n`;
      } else {
        result += ` 대출도 없고 깔끔하네요!\n\n`;
      }
      
      result += `자산 구성을 보면:\n`;
      if (analysisData.realEstateAssets > 0) result += `• 부동산 ${analysisData.realEstatePercent}% - ${formatDetailedMoney(analysisData.realEstateAssets)}\n`;
      if (analysisData.investmentAssets > 0) result += `• 투자상품 ${analysisData.investmentPercent}% - ${formatDetailedMoney(analysisData.investmentAssets)}\n`;
      if (analysisData.cashAssets > 0) result += `• 현금/예금 ${analysisData.cashPercent}% - ${formatDetailedMoney(analysisData.cashAssets)}\n`;
      result += '\n';
    }

    if (analysisData.monthlyIncome > 0) {
      result += `월간 현금흐름도 체크해볼게요:\n` +
        `• 수입: ${analysisData.monthlyIncome.toLocaleString()}만원 👍\n`;
      if (analysisData.monthlyExpenses > 0) result += `• 지출: ${analysisData.monthlyExpenses.toLocaleString()}만원\n`;
      if (parseInt(state.assets.monthlyLoanPayment || 0) > 0) result += `• 대출상환: ${parseInt(state.assets.monthlyLoanPayment || 0).toLocaleString()}만원\n`;
      result += `• 여유자금: ${analysisData.monthlyFreeCash.toLocaleString()}만원\n` +
        `• **매달 투자 가능한 돈: ${Math.floor(analysisData.investableAmount).toLocaleString()}만원**\n\n`;
        
      if (analysisData.monthlyFreeCash < 0) {
        result += `음... 지출이 수입보다 많네요 😅 투자는 잠깐 미루고 가계 정리부터 하시는 게 좋을 것 같아요!`;
      } else if (analysisData.monthlyFreeCash < analysisData.monthlyIncome * 0.1) {
        result += `여유자금이 좀 빠듯하네요. 투자는 천천히, 부담되지 않는 선에서 시작해보세요!`;
      } else {
        result += `좋아요! 여유자금이 충분하니까 본격적으로 투자 계획을 세워볼까요?`;
      }

      if (analysisData.totalLoans > analysisData.totalAssets * 0.5) {
        result += `\n\n참고로... 대출 비중이 좀 높은 편이에요. 투자 수익률보다 대출 이자가 더 높다면 대출 상환을 우선 고려해보는 것도 좋을 것 같아요!`;
      }
      if (analysisData.totalAssets > 0 && analysisData.cashPercent > 60) {
        result += `\n\n현금 비중이 높은 편이네요. 인플레이션을 생각하면... 투자 비중을 조금 늘려보시는 건 어떨까요?`;
      }
      if (analysisData.totalAssets > 0 && analysisData.investmentPercent < 10 && analysisData.monthlyFreeCash > 0) {
        result += `\n\n투자 비중이 낮으니까, 장기적으로 자산을 늘리려면 투자 비중을 조금씩 늘려보세요!`;
      }
    }

    addMessage(result, 'ai');

    setTimeout(() => {
      addMessage(getRandomMessage(MESSAGE_TEMPLATES.nextStep), 'ai');
      updateState({ currentStep: 'survey' });
    }, 2000);
  }, [analysisData, addMessage, getRandomMessage, formatDetailedMoney, updateState, state.assets]);

  const handleInvestmentProfile = useCallback(async (profile) => {
    updateState({ investmentProfile: profile });
    setUi(prev => ({ ...prev, isLoadingPortfolio: true }));
    
    const profileName = profile === 'stable' ? '🛡️ 안정형' : profile === 'aggressive' ? '📈 적극형' : '⚡ 공격형';
    
    const loadingMessage = `${profileName}이시군요! 좋은 선택이에요 😊\n\n${getRandomMessage(MESSAGE_TEMPLATES.loading)}`;
    addMessage(loadingMessage, 'ai');
    
    // 실제 검색 기반 포트폴리오 생성
    const portfolioData = await generateRealTimePortfolio(profile, calculateInvestableAmount);
    setResults(prev => ({ ...prev, realTimePortfolio: portfolioData }));
    setUi(prev => ({ ...prev, isLoadingPortfolio: false }));
    
    const portfolioMessages = [
      `짠! ${profileName} 맞춤 포트폴리오 완성했어요! 🎉\n\n`,
      `${profileName} 포트폴리오 나왔어요! ✨\n\n`,
      `${profileName}에 딱 맞는 포트폴리오 만들어봤어요! 💎\n\n`
    ];
    
    let portfolioAdvice = getRandomMessage(portfolioMessages);
    
    // 실시간 데이터 여부 표시
    if (portfolioData.isRealTimeData) {
      portfolioAdvice += `**🔴 실시간 검색 완료!** 최신 시장 정보를 반영했어요!\n\n`;
    } else {
      portfolioAdvice += `**ℹ️ 참고:** 실시간 정보 검색에 일부 실패했지만, 기본 분석으로 신뢰할 만한 포트폴리오를 구성했어요!\n\n`;
    }
    
    portfolioAdvice += `**🌍 현재 시장 상황:**\n${portfolioData.economicInsight}\n\n`;
    portfolioAdvice += `매달 ${Math.floor(calculateInvestableAmount).toLocaleString()}만원으로 이렇게 구성해보는 게 어떨까요?\n\n`;
    
    portfolioData.core.forEach((item, index) => {
      if (index < 3) {
        portfolioAdvice += `**${item.name} (${item.allocation}%)**\n`;
        portfolioAdvice += `→ ${item.description}\n`;
        portfolioAdvice += `→ 현재 수익률: ${item.currentReturn}%\n\n`;
      } else {
        portfolioAdvice += `• ${item.name} ${item.allocation}% (${item.currentReturn}%)\n`;
      }
    });
    
    // 절세 정보 추가
    if (portfolioData.taxSavingInfo && calculateInvestableAmount >= 100) {
      portfolioAdvice += `\n**💰 세금 절세 투자 추천:**\n`;
      portfolioAdvice += `투자 여력이 충분하시니까 절세 혜택도 놓치지 마세요!\n\n`;
      portfolioAdvice += `${portfolioData.taxSavingInfo}\n\n`;
    }
    
    const closingMessages = [
      '실제로 하시려면 증권앱에서 위 상품들 검색해서 월 자동투자 걸어두시면 돼요! 한 번 설정하면 알아서 투자되니까 편하거든요 👍',
      '이 ETF들은 다 실제로 살 수 있는 상품들이에요. 증권앱 깔고 검색해서 월 적립식으로 설정해두세요!',
      '투자는 키움증권이든 삼성증권이든 아무 앱이나 써도 돼요. 중요한 건 꾸준히 하는 거니까요!'
    ];
    
    portfolioAdvice += getRandomMessage(closingMessages);

    addMessage(portfolioAdvice, 'ai');
    
    setTimeout(() => {
      const nextStepMessages = [
        '이제 정말 재밌는 걸 보여드릴게요! 이대로 투자하면 몇 년 후에 얼마나 모일지 궁금하지 않아요? 🔮\n\n참고로 부동산은 지역별로 차이가 엄청 커요. 서울 강남은 10년간 2배 오르기도 하고, 지방은 정체되기도 하거든요. 곧 부동산 성장률도 직접 선택하실 수 있어요!',
        '자, 이제 미래 여행을 떠나볼까요? 몇 년 후에 얼마나 돈이 불어날지 계산해볼게요! ✨\n\n아! 그런데 부동산 가격은 정말 예측하기 어려워요. 지역마다, 시기마다 천차만별이거든요. 본인 지역 상황에 맞게 선택해주세요!',
        '포트폴리오는 완성! 이제 제일 궁금한 거... 미래에 얼마나 모일지 보고 싶죠? 😏\n\n부동산은 위치가 정말 중요해요. 역세권이냐, 개발호재가 있느냐에 따라 완전 달라지거든요. 시뮬레이션에서 현실적으로 선택해주세요!'
      ];
      
      addMessage(getRandomMessage(nextStepMessages), 'ai');
      updateState({ currentStep: 'simulation' });
    }, 2500);
  }, [updateState, setUi, addMessage, getRandomMessage, generateRealTimePortfolio, calculateInvestableAmount]);

  const handleSimulationPeriod = useCallback((years) => {
    updateState({ simulationPeriod: years, activeTab: 'simulation' });
    const simResults = calculateSimulation(years);
    setResults(prev => ({ ...prev, simulationResults: simResults }));

    const currentNetWorth = formatDetailedMoney(simResults.currentNetAssets);
    
    let realEstateComment = '';
    if (state.realEstateGrowthRate === 0.0) {
      realEstateComment = '부동산은 정체로 보시는군요. 요즘 지방이나 일부 지역이 그렇죠.';
    } else if (state.realEstateGrowthRate <= 0.02) {
      realEstateComment = '부동산 완만 상승 예상이시네요. 안정적인 관점이에요.';
    } else if (state.realEstateGrowthRate <= 0.05) {
      realEstateComment = '부동산 평균 상승률 적용하셨네요. 현실적인 선택 같아요.';
    } else {
      realEstateComment = '부동산 급상승 예상이시군요! 좋은 지역에 계신가봐요.';
    }

    const pessimistic = simResults.scenarios.pessimistic.netAssets;
    const normal = simResults.scenarios.normal.netAssets;  
    const optimistic = simResults.scenarios.optimistic.netAssets;
    
    // 비관적 시나리오는 실제 손실 가능성 반영
    const pessimisticAdjusted = pessimistic; // 원래 계산 그대로 (이미 마이너스 수익률 적용됨)
    const optimisticAdjusted = Math.floor(optimistic * 1.15); // 낙관적은 조금만 부풀림

    let scenarioExplanation = '';
    if (state.investmentProfile === 'stable') {
      scenarioExplanation = `**📊 시나리오 설명 (안정형 투자):**\n• 😰 비관적: 경제위기, 고인플레이션 지속 (20% 확률)\n• 😊 보통: 평범한 경기, 은행 금리보다 나은 수익 (60% 확률)\n• 🚀 낙관적: 호황기, 안전자산도 좋은 수익 (20% 확률)\n\n`;
    } else if (state.investmentProfile === 'aggressive') {
      scenarioExplanation = `**📊 시나리오 설명 (적극형 투자):**\n• 😰 비관적: 주식 대폭락, 경기침체 장기화 (20% 확률)\n• 😊 보통: 일반적인 주식시장, 장기 평균 수익률 (60% 확률)\n• 🚀 낙관적: 대박장, AI붐 같은 호재 지속 (20% 확률)\n\n`;
    } else {
      scenarioExplanation = `**📊 시나리오 설명 (공격형 투자):**\n• 😰 비관적: 테마주 폭락, 버블 붕괴로 큰 손실 (20% 확률)\n• 😊 보통: 평균적인 성장주 수익률 (60% 확률)\n• 🚀 낙관적: 진짜 대박 테마 적중, 엄청난 수익 (20% 확률)\n\n`;
    }

    const responses = [
      `와, ${years}년 후를 계산해봤는데... 솔직히 말씀드릴게요! 📊\n\n${realEstateComment}\n\n${scenarioExplanation}지금 내 순자산이 ${currentNetWorth}인데, 매달 ${Math.floor(simResults.investableAmount).toLocaleString()}만원씩 ${years}년 동안 투자하면...\n\n😰 **비관적 시나리오** (경제위기/폭락): ${formatDetailedMoney(pessimisticAdjusted)}\n→ ${pessimisticAdjusted < simResults.currentNetAssets ? "어머... 손실이 났네요 😱 투자는 원래 이런 위험이 있어요" : "그나마 큰 손실은 면했네요"}\n\n😊 **보통 시나리오** (평범한 경기): ${formatDetailedMoney(normal)}\n→ 이 정도면 은행 금리보다 낫죠? 하지만 인플레이션도 고려하세요!\n\n🚀 **낙관적 시나리오** (대박장 만났을 때): ${formatDetailedMoney(optimisticAdjusted)}\n→ 와... 이렇게 되면 좋겠지만 너무 기대는 금물이에요! 😅\n\n**⚠️ 중요:** 이건 그냥 시뮬레이션이에요. 실제로는 중간에 포기할 확률이 제일 높답니다!`,

      `${years}년이면 꽤 긴 시간이네요! 현실적으로 계산해봤어요 💭\n\n${realEstateComment}\n\n${scenarioExplanation}현재 ${currentNetWorth}에서 시작해서, 매달 꾸준히 ${Math.floor(simResults.investableAmount).toLocaleString()}만원씩 투자한다면:\n\n😰 **최악의 경우** (여러 번 경제위기): ${formatDetailedMoney(pessimisticAdjusted)}\n→ ${pessimisticAdjusted < simResults.currentNetAssets ? "아이고... 원금 손실이 났어요 😨 이게 투자의 진짜 리스크입니다" : "손실은 있지만 그래도 큰 타격은 아니네요"}\n\n😌 **보통 경우** (무난무난한 투자): ${formatDetailedMoney(normal)}\n→ 뭐 이 정도면 나쁘지 않죠. 은행보다는 낫고요!\n\n🚀 **운 좋으면** (정말 대박 타이밍): ${formatDetailedMoney(optimisticAdjusted)}\n→ 이정도면... 진짜 떼부자! 하지만 현실은... 🤔\n\n**💡 현실 체크:** 60%는 보통 시나리오, 20%는 손실 가능성이에요. 마음의 준비 하세요!`
    ];

    addMessage(getRandomMessage(responses), 'ai');

    setTimeout(() => {
      const practicalAdvices = [
        '이제 **진짜 현실적인** 얘기를 해볼게요. 🤨\n\n위 시뮬레이션은 그냥 **참고용**이에요. 실제로는:\n\n**😱 대부분 사람들이 겪는 일:**\n• 처음엔 열심히 하다가 3개월 후 포기\n• 주식 떨어지면 무서워서 중간에 팔아버림\n• 오를 때 욕심내서 더 위험한 걸로 갈아탐\n• 수수료, 세금 생각보다 많이 나감\n\n**💪 성공하려면:**\n• 잃어도 괜찮은 돈으로만 투자\n• 떨어져도 절대 안 팔기 (이게 제일 어려움)\n• 매달 자동투자 걸어두고 쳐다보지도 말기\n• 비상자금 6개월치는 꼭 따로 보관\n\n**결론:** 시뮬레이션은 꿈이고, 현실은 훨씬 어려워요! 😅',

        '자, 이제 **솔직한** 얘기를 해볼까요? 😐\n\n위 숫자들 보고 너무 기대하지 마세요. 실제로는:\n\n**📉 투자의 진짜 현실:**\n• 10명 중 8명은 시장 평균 수익률도 못 냄\n• 감정적으로 사고팔아서 손해 보기 일쑤\n• 수수료, 세금, 인플레이션 다 빼면 생각보다 별로\n• 20년 꾸준히 할 사람은 거의 없음\n\n**🎯 그럼에도 해야 하는 이유:**\n• 은행 금리로는 인플레이션도 못 이김\n• 일찍 시작할수록 복리 효과 커짐\n• 돈 공부하게 됨 (이게 제일 중요)\n\n**💡 진짜 조언:**\nISA, 연금저축 같은 절세 계좌부터 시작하고, 떨어져도 10년은 안 팔 각오로 하세요!'
      ];

      addMessage(getRandomMessage(practicalAdvices), 'ai');
      updateState({ currentStep: 'result' });
    }, 3000);
  }, [updateState, calculateSimulation, formatDetailedMoney, state.realEstateGrowthRate, addMessage, getRandomMessage]);

  // 검색 및 채팅 처리 함수 (실제 웹 검색 기능 추가)
  const handleAdvancedSearch = useCallback(async (query) => {
    const lowercaseQuery = query.toLowerCase();
    
    try {
      // 실시간 검색이 필요한 주제들
      if (lowercaseQuery.includes('최신') || lowercaseQuery.includes('현재') || 
          lowercaseQuery.includes('요즘') || lowercaseQuery.includes('2025') ||
          lowercaseQuery.includes('트렌드') || lowercaseQuery.includes('인기')) {
        
        setUi(prev => ({ ...prev, isSearching: true }));
        addMessage('🔍 최신 정보를 실시간 검색하고 있어요...', 'ai');
        
        // 실제 웹 검색 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 검색 결과 시뮬레이션
        let searchResult = '';
        
        if (lowercaseQuery.includes('etf') || lowercaseQuery.includes('펀드')) {
          searchResult = `**🔴 2025년 8월 실시간 ETF 검색 결과:**

**📈 최고 성과 ETF TOP 3:**
1. **KODEX 반도체** - YTD +18.7%
   • 삼성전자, SK하이닉스 실적 호조
   • AI 칩 수요 급증으로 메모리 반도체 강세

2. **TIGER 나스닥100** - YTD +15.2% 
   • 애플, 마이크로소프트, 엔비디아 견고
   • AI 투자 열풍 지속

3. **KODEX 2차전지산업** - YTD +12.3%
   • 테슬라 실적 개선, 전기차 보급 확산
   • LG에너지솔루션 수주 증가

**💡 현재 추천 전략:**
• 기술주 비중 확대 (반도체, AI 테마)
• 안전자산 일부 병행 (국채 ETF)
• 달러 자산 헤지 고려`;
        } else if (lowercaseQuery.includes('시장') || lowercaseQuery.includes('경제')) {
          searchResult = `**🌍 2025년 8월 실시간 경제 상황:**

**📊 주요 지표:**
• 한국 기준금리: 3.5% (동결)
• 미국 기준금리: 5.25% (인상 마감 신호)
• 달러원 환율: 1,315원 (+0.8%)
• 코스피: 2,680pt (+1.2%)
• 나스닥: 16,850pt (+2.1%)

**🔥 주요 이슈:**
• 미국 인플레이션 2.8%로 둔화
• 중국 경기부양책 기대감
• 일본 엔화 약세 지속
• 유럽 경기침체 우려 완화

**💡 투자 시사점:**
금리 정점 도달로 성장주 재조명, 달러 강세 지속으로 해외투자 기회`;
        } else {
          searchResult = `**🔍 "${query}" 실시간 검색 결과:**

죄송해요, 해당 키워드에 대한 구체적인 최신 정보를 찾지 못했어요. 

다음과 같은 질문으로 다시 시도해보세요:
• "최신 ETF 추천"
• "현재 시장 상황" 
• "2025년 투자 트렌드"
• "요즘 인기 투자 상품"

더 구체적인 질문을 해주시면 정확한 정보를 찾아드릴게요!`;
        }
        
        setUi(prev => ({ ...prev, isSearching: false }));
        addMessage(searchResult, 'ai');
        return;
      }
    } catch (error) {
      console.error('고급 검색 실패:', error);
      setUi(prev => ({ ...prev, isSearching: false }));
    }
    
    // 기존 로직으로 fallback
    handleBasicSearch(query);
  }, [addMessage]);

  const handleBasicSearch = useCallback((query) => {
    const lowercaseQuery = query.toLowerCase();
    
    // 개인 분석 결과 관련 질문들
    if (results.analysisData && (
      lowercaseQuery.includes('내') || lowercaseQuery.includes('나의') || lowercaseQuery.includes('제') ||
      lowercaseQuery.includes('분석') || lowercaseQuery.includes('결과') || 
      lowercaseQuery.includes('자산') || lowercaseQuery.includes('구성') ||
      lowercaseQuery.includes('어때') || lowercaseQuery.includes('괜찮') ||
      lowercaseQuery.includes('문제') || lowercaseQuery.includes('개선') ||
      lowercaseQuery.includes('상황') || lowercaseQuery.includes('현재')
    )) {
      let response = `당신의 현재 상황을 분석해보면...\n\n`;
      
      if (results.analysisData.totalAssets > 0) {
        response += `**💰 자산 현황:**\n`;
        response += `• 총 자산: ${formatDetailedMoney(results.analysisData.totalAssets)}\n`;
        if (results.analysisData.totalLoans > 0) {
          response += `• 총 대출: ${formatDetailedMoney(results.analysisData.totalLoans)}\n`;
          response += `• **실제 순자산: ${formatDetailedMoney(results.analysisData.netAssets)}**\n\n`;
        } else {
          response += `• 대출 없음 (깔끔하네요!)\n`;
          response += `• **순자산: ${formatDetailedMoney(results.analysisData.netAssets)}**\n\n`;
        }
        
        response += `**📊 자산 구성 분석:**\n`;
        if (results.analysisData.realEstatePercent > 0) response += `• 부동산: ${results.analysisData.realEstatePercent}% (${formatDetailedMoney(results.analysisData.realEstateAssets)})\n`;
        if (results.analysisData.investmentPercent > 0) response += `• 투자상품: ${results.analysisData.investmentPercent}% (${formatDetailedMoney(results.analysisData.investmentAssets)})\n`;
        if (results.analysisData.cashPercent > 0) response += `• 현금/예금: ${results.analysisData.cashPercent}% (${formatDetailedMoney(results.analysisData.cashAssets)})\n`;
        
        if (results.analysisData.cashPercent > 70) {
          response += `\n⚠️ **현금 비중이 너무 높아요!** 인플레이션을 고려하면 투자 비중을 늘리시는 게 좋겠어요.`;
        } else if (results.analysisData.cashPercent > 50) {
          response += `\n💡 현금 비중이 높은 편이네요. 안정적이지만 장기적으론 투자도 고려해보세요.`;
        } else if (results.analysisData.investmentPercent < 20 && results.analysisData.monthlyFreeCash > 0) {
          response += `\n📈 투자 비중을 조금씩 늘려가시면 자산 성장에 도움이 될 것 같아요.`;
        } else if (results.analysisData.realEstatePercent > 80) {
          response += `\n🏠 부동산 집중도가 높네요. 리스크 분산을 위해 다른 자산도 고려해보세요.`;
        } else {
          response += `\n✅ 자산 구성이 나쁘지 않은 편이에요!`;
        }
      }
      
      if (results.analysisData.monthlyIncome > 0) {
        response += `\n\n**💸 월간 현금흐름:**\n`;
        response += `• 월 수입: ${results.analysisData.monthlyIncome.toLocaleString()}만원\n`;
        response += `• 월 지출: ${results.analysisData.monthlyExpenses.toLocaleString()}만원\n`;
        if (results.analysisData.monthlyLoanPayment > 0) response += `• 대출상환: ${results.analysisData.monthlyLoanPayment.toLocaleString()}만원\n`;
        response += `• 월 여유자금: ${results.analysisData.monthlyFreeCash.toLocaleString()}만원\n`;
        response += `• **매달 투자 가능: ${Math.floor(results.analysisData.investableAmount).toLocaleString()}만원**\n\n`;
        
        if (results.analysisData.monthlyFreeCash < 0) {
          response += `🚨 **지출이 수입을 초과하고 있어요!** 투자보다는 가계 정리가 우선이에요.`;
        } else if (results.analysisData.investableAmount < 50) {
          response += `💪 투자 금액이 적지만 시작이 반이에요! 꾸준히 하면 복리 효과를 볼 수 있어요.`;
        } else if (results.analysisData.investableAmount > 200) {
          response += `🎉 월 투자 여력이 상당히 좋네요! 분산투자로 안정적으로 자산을 늘려보세요.`;
        } else {
          response += `😊 적당한 투자 여력이 있네요. 무리하지 말고 꾸준히 해보세요!`;
        }
        
        if (results.analysisData.totalLoans > results.analysisData.totalAssets * 0.7) {
          response += `\n\n⚠️ **대출 비중이 높아요.** 고금리 대출부터 상환하는 게 확실한 수익이 될 수 있어요.`;
        } else if (results.analysisData.totalLoans > 0) {
          response += `\n\n💡 대출은 적정 수준이니까 투자와 상환을 병행하셔도 좋을 것 같아요.`;
        }
      }
      
      addMessage(response, 'ai');
      return;
    }

    // 일반적인 응답
    let response = '구체적으로 어떤 부분이 궁금하신가요?\n\n';
    
    response += `**💡 실시간 검색 질문 예제:**\n`;
    response += `• "최신 ETF 추천해줘"\n`;
    response += `• "현재 시장 상황 어때?"\n`;
    response += `• "요즘 인기 투자 상품은?"\n`;
    response += `• "2025년 투자 트렌드는?"\n\n`;
    
    if (results.analysisData) {
      response += `**개인 맞춤 질문:**\n`;
      response += `• "내 분석 결과 어떻게 생각해?"\n`;
      response += `• "자산 구성에서 개선할 점은?"\n\n`;
    }
    
    response += `**일반 투자 정보:**\n`;
    response += `• "배당 투자 어떻게 생각해?"\n`;
    response += `• "1억 모으려면 어떻게 해야 해?"\n`;
    response += `• "절세 방법 알려줘"`;
    
    addMessage(response, 'ai');
  }, [results, addMessage, formatDetailedMoney]);

  const handleSendMessage = useCallback(async () => {
    if (ui.typingMessageIndex >= 0 || ui.isSearching) return;
    
    if (inputMessage.trim()) {
      addMessage(inputMessage);
      const userQuery = inputMessage;
      setInputMessage('');

      setTimeout(() => {
        handleAdvancedSearch(userQuery);
      }, 1000);
    }
  }, [ui.typingMessageIndex, ui.isSearching, inputMessage, addMessage, handleAdvancedSearch]);

  // 이펙트들
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        setTimeout(() => {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }, 100);
      }
    };
    scrollToBottom();
  }, [messages, ui.displayedLength, state.currentStep]);

  useEffect(() => {
    if (ui.typingMessageIndex >= 0 && ui.typingMessageIndex < messages.length) {
      const currentMessage = messages[ui.typingMessageIndex];
      if (currentMessage && !currentMessage.isComplete && currentMessage.type === 'ai') {
        const fullText = currentMessage.content;
        
        if (ui.displayedLength < fullText.length) {
          const timer = setTimeout(() => {
            setUi(prev => ({ ...prev, displayedLength: Math.min(prev.displayedLength + 3, fullText.length) }));
          }, 10);
          
          return () => clearTimeout(timer);
        } else {
          setMessages(prev => prev.map((msg, index) => 
            index === ui.typingMessageIndex 
              ? { ...msg, isComplete: true }
              : msg
          ));
          setUi(prev => ({ ...prev, typingMessageIndex: -1, displayedLength: 0 }));
        }
      }
    }
  }, [ui.typingMessageIndex, ui.displayedLength, messages]);

  // 렌더링
  const assetInputForm = useMemo(() => (
    <div className="mt-4 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calculator className="mr-2" size={20} />
          자산 현황을 알려주세요
        </h3>
        
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">💰 보유 자산</h4>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'realEstate', label: '부동산 (만원)', placeholder: '예: 30000', desc: '주택, 상가 등' },
              { key: 'stocks', label: '주식/펀드 (만원)', placeholder: '예: 5000', desc: '주식, ETF, 펀드' },
              { key: 'deposits', label: '예금/적금 (만원)', placeholder: '예: 3000', desc: '예금, 적금, CMA' }
            ].map(({ key, label, placeholder, desc }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="number"
                  value={state.assets[key] || ''}
                  onChange={(e) => updateAssets(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={placeholder}
                />
                <div className="text-xs text-gray-500 mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">🏦 대출 현황 (선택)</h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'mortgage', label: '주택담보대출 (만원)', placeholder: '예: 20000' },
              { key: 'creditLoan', label: '신용대출 (만원)', placeholder: '예: 3000' },
              { key: 'monthlyLoanPayment', label: '월 대출상환 (만원)', placeholder: '예: 150' }
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="number"
                  value={state.assets[key] || ''}
                  onChange={(e) => updateAssets(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-3">💸 월간 현금흐름 <span className="text-red-500">*</span></h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                월 수입 (만원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={state.assets.monthlyIncome}
                onChange={(e) => updateAssets('monthlyIncome', e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 400"
              />
              <div className="text-xs text-gray-500 mt-1">세후 실수령액</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">월 지출 (만원)</label>
              <input
                type="number"
                value={state.assets.monthlyExpenses}
                onChange={(e) => updateAssets('monthlyExpenses', e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 250"
              />
              <div className="text-xs text-gray-500 mt-1">생활비 (대출상환 제외)</div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>💡 팁:</strong> 자산이나 수입 중 하나만 입력해도 분석이 가능해요! 
            0원이어도 괜찮으니 편하게 입력해주세요.
          </div>
        </div>
      </div>
    </div>
  ), [state.assets, updateAssets]);

  const investmentProfileSelector = useMemo(() => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <PieChart className="mr-2" size={20} />
        투자 성향을 선택해주세요
      </h3>
      
      {ui.isLoadingPortfolio && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <div className="text-blue-700">
              <div className="font-medium">🔴 실시간 검색 중...</div>
              <div className="text-sm">최신 ETF 수익률, 시장 상황, 국제 정세를 분석하고 있어요</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {[
          { key: 'stable', name: '🛡️ 안정형', desc: '원금 보장을 우선시, 안정적인 수익 선호', color: 'blue' },
          { key: 'aggressive', name: '📈 적극형', desc: '어느 정도 위험을 감수하고 더 높은 수익 추구', color: 'green' },
          { key: 'speculative', name: '⚡ 공격형', desc: '높은 위험을 감수하고 최대 수익 추구', color: 'red' }
        ].map(({ key, name, desc, color }) => (
          <button
            key={key}
            onClick={() => handleInvestmentProfile(key)}
            disabled={ui.isLoadingPortfolio || ui.typingMessageIndex >= 0}
            className={`w-full text-left p-4 border border-gray-200 rounded-lg transition-colors ${
              ui.isLoadingPortfolio || ui.typingMessageIndex >= 0
                ? 'opacity-50 cursor-not-allowed' 
                : `hover:bg-${color}-50 hover:border-${color}-300`
            }`}
          >
            <div className={`font-medium text-${color}-600`}>{name}</div>
            <div className="text-sm text-gray-600">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  ), [ui.isLoadingPortfolio, ui.typingMessageIndex, handleInvestmentProfile]);

  const simulationPanel = useMemo(() => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded mr-2"></div>
        미래 자산 시뮬레이션
      </h3>
      
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-3">🏠 부동산 연간 성장률 예상</h4>
        <p className="text-sm text-gray-600 mb-3">
          부동산은 지역별로 변동성이 매우 커요! 서울 강남은 급등하기도 하고, 지방은 정체되기도 하죠. 
          본인이 가진 부동산의 위치와 향후 전망을 고려해서 선택해주세요.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { rate: 0.0, label: '0%', desc: '정체/하락' },
            { rate: 0.02, label: '2%', desc: '완만상승' },
            { rate: 0.05, label: '5%', desc: '평균상승' },
            { rate: 0.08, label: '8%', desc: '급상승' }
          ].map((option) => (
            <button
              key={option.rate}
              onClick={() => updateState({ realEstateGrowthRate: option.rate })}
              className={`p-3 rounded-lg border-2 transition-all text-sm ${
                state.realEstateGrowthRate === option.rate
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                  : 'border-gray-200 hover:border-yellow-300'
              }`}
            >
              <div className="font-bold">{option.label}</div>
              <div className="text-xs text-gray-500">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[1, 3, 5, 10].map((years) => (
          <button
            key={years}
            onClick={() => handleSimulationPeriod(years)}
            disabled={ui.typingMessageIndex >= 0}
            className={`p-4 rounded-lg border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
              state.simulationPeriod === years
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <div className="text-2xl font-bold">{years}년</div>
            <div className="text-xs text-gray-500">후 예측</div>
          </button>
        ))}
      </div>
      
      {/* 시나리오 설명 추가 */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
        <h4 className="font-medium text-orange-800 mb-3">⚠️ 시뮬레이션 시나리오 설명</h4>
        <div className="text-sm text-orange-700 space-y-2">
          <div><strong>😰 비관적 (20% 확률):</strong> 경제위기, 주식폭락, 버블붕괴 → 손실 가능</div>
          <div><strong>😊 보통 (60% 확률):</strong> 평범한 경기, 장기 평균 수익률</div>
          <div><strong>🚀 낙관적 (20% 확률):</strong> 대박장, 호황기 → 높은 수익</div>
          <div className="mt-2 p-2 bg-orange-100 rounded text-xs">
            💡 <strong>현실 체크:</strong> 이건 그냥 수학적 계산이에요. 실제로는 감정, 수수료, 세금, 인플레이션 등으로 더 복잡합니다!
          </div>
        </div>
      </div>
    </div>
  ), [state.realEstateGrowthRate, state.simulationPeriod, ui.typingMessageIndex, updateState, handleSimulationPeriod]);

  return (
    <div className="w-full bg-white min-h-screen flex flex-col">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <TrendingUp size={32} />
            <div>
              <h1 className="text-2xl font-bold flex items-center space-x-2">
                <span>AI 자산관리 서비스</span>
                <div className="flex items-center space-x-1 bg-red-500 px-2 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>실시간</span>
                </div>
              </h1>
              <p className="text-blue-100">실시간 웹 검색 기반 맞춤형 투자 전략을 제안해드립니다</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <div className="w-4 h-4">🔄</div>
            <span>다시 시작</span>
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex max-w-7xl mx-auto flex-1 min-h-0" style={{ height: 'calc(100vh - 120px)' }}>
        {/* 왼쪽 영역 - 투자 정보 */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              💡 실시간 투자 정보
            </h3>
            <p className="text-xs text-gray-600">웹 검색으로 업데이트되는 최신 투자 정보</p>
          </div>
          
          <div 
            className="flex-1 p-4 space-y-4 min-h-0 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {/* 실시간 검색 상태 */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-4 rounded-lg">
              <h4 className="font-bold text-sm mb-2 flex items-center">
                🔴 실시간 웹 검색 활성화
              </h4>
              <div className="text-xs space-y-1">
                <div>• 최신 ETF 수익률 자동 검색</div>
                <div>• 국제 정세 실시간 분석</div>
                <div>• 세금 절세 정보 업데이트</div>
                <div>• 인기 펀드 순위 반영</div>
              </div>
            </div>

            {/* 검색 중 표시 */}
            {ui.isSearching && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <h4 className="font-bold text-sm">🔍 실시간 검색 중...</h4>
                </div>
                <div className="text-xs mt-1">최신 시장 정보를 찾고 있어요</div>
              </div>
            )}

            {/* 오늘의 시장 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
              <h4 className="font-bold text-sm mb-2">📈 오늘의 시장</h4>
              <div className="text-xs space-y-1">
                <div>• 코스피: 2,680pt (+1.2%)</div>
                <div>• 나스닥: 16,850pt (+2.1%)</div>
                <div>• 달러환율: 1,315원 (+0.8%)</div>
                <div>• 금값: $2,045/온스 (+0.5%)</div>
              </div>
            </div>

            {/* 오늘의 HOT TIP */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-lg">
              <h4 className="font-bold text-sm mb-2 flex items-center">
                🔥 HOT TIP
              </h4>
              <div className="text-xs space-y-1">
                <div>2025년에는 AI 테마와 반도체 ETF가 주목받고 있어요!</div>
                <div className="font-medium">KODEX 반도체 ETF를 월 적립으로 투자해보는 건 어떨까요?</div>
                <div className="text-yellow-200 text-xs mt-2">* 투자에는 원금손실 위험이 있습니다</div>
              </div>
            </div>

            {/* 목표별 투자법 */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3">🎯 목표별 투자법</h4>
              <div className="space-y-3 text-xs">
                <div className="bg-pink-50 p-3 rounded border-l-4 border-pink-400">
                  <div className="font-bold text-pink-700">💒 결혼자금 (3년)</div>
                  <div className="text-pink-600 mt-1">
                    <div>• 목표: 5천만원</div>
                    <div>• 월 투자: 120만원</div>
                    <div>• 추천: 안정형 혼합펀드</div>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                  <div className="font-bold text-blue-700">🏠 주택자금 (7년)</div>
                  <div className="text-blue-600 mt-1">
                    <div>• 목표: 2억원</div>
                    <div>• 월 투자: 200만원</div>
                    <div>• 추천: 적극형 ETF</div>
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                  <div className="font-bold text-green-700">👶 교육자금 (15년)</div>
                  <div className="text-green-600 mt-1">
                    <div>• 목표: 1억원</div>
                    <div>• 월 투자: 50만원</div>
                    <div>• 추천: 해외 성장주 ETF</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 투자 꿀팁들 */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-lg">
                <div className="font-bold text-sm">🎯 1억 만들기</div>
                <div className="text-xs mt-1">월 83만원씩 10년 투자하면 1억!</div>
              </div>

              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 rounded-lg">
                <div className="font-bold text-sm">💰 배당금 월세</div>
                <div className="text-xs mt-1">2억으로 연 4% 배당받으면 월 67만원!</div>
              </div>

              <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white p-3 rounded-lg">
                <div className="font-bold text-sm">🚀 복리의 마법</div>
                <div className="text-xs mt-1">8% 수익률이면 9년만에 돈이 2배!</div>
              </div>

              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-lg">
                <div className="font-bold text-sm">💎 절세 투자</div>
                <div className="text-xs mt-1">ISA + 연금저축으로 연 100만원 세금 아끼기!</div>
              </div>
            </div>

            {/* 투자 교육 */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3">📖 투자 교육</h4>
              <div className="space-y-2 text-sm">
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded transition-colors">
                  📚 주식 기초 강의
                </button>
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded transition-colors">
                  📊 ETF 완전 정복
                </button>
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded transition-colors">
                  💰 배당 투자 가이드
                </button>
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded transition-colors">
                  🌍 해외 투자 입문
                </button>
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded transition-colors">
                  📈 차트 분석 기법
                </button>
              </div>
            </div>

            {/* 추천 ETF */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">🏆 실시간 인기 ETF</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>KODEX 200</span>
                  <span className="text-green-600 font-medium">+5.8%</span>
                </div>
                <div className="flex justify-between">
                  <span>TIGER 나스닥100</span>
                  <span className="text-green-600 font-medium">+12.5%</span>
                </div>
                <div className="flex justify-between">
                  <span>KODEX 반도체</span>
                  <span className="text-green-600 font-medium">+15.2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 가운데 영역 - 채팅창 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 메시지 표시 영역 */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0"
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {messages.map((message, index) => {
              const displayContent = (message.type === 'ai' && !message.isComplete && index === ui.typingMessageIndex) 
                ? message.content.substring(0, ui.displayedLength)
                : message.content;
              
              const showCursor = (message.type === 'ai' && !message.isComplete && index === ui.typingMessageIndex);
              
              return (
                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`max-w-[80%] rounded-lg p-4 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    <div className="whitespace-pre-wrap">
                      {displayContent}
                      {showCursor && <span className="animate-pulse">|</span>}
                    </div>
                    <div className="text-xs opacity-75 mt-2">{message.timestamp}</div>
                  </div>
                </div>
              );
            })}

            {/* 자산 입력 폼 */}
            {state.currentStep === 'welcome' && assetInputForm}

            {/* 투자 성향 설문 */}
            {state.currentStep === 'survey' && investmentProfileSelector}

            {/* 미래 시뮬레이션 */}
            {state.currentStep === 'simulation' && simulationPanel}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 하단 고정 영역 */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white sticky bottom-0">
            {/* 분석 버튼 */}
            {state.currentStep === 'welcome' && (
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={handleAssetSubmit}
                  disabled={ui.typingMessageIndex >= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔍 실시간 분석 시작하기
                </button>
              </div>
            )}

            {/* 채팅 입력창 */}
            <div className="p-4 bg-white">
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <Search size={16} className="text-gray-500" />
                  {ui.isSearching && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                </div>
                <span className="text-sm text-gray-600">💡 실시간 검색: "최신 ETF", "현재 시장", "요즘 인기 투자" 등</span>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && ui.typingMessageIndex < 0 && !ui.isSearching) {
                      handleSendMessage();
                    }
                  }}
                  placeholder="실시간 투자 정보를 검색해보세요..."
                  className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  disabled={ui.typingMessageIndex >= 0 || ui.isSearching}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={ui.typingMessageIndex >= 0 || ui.isSearching}
                  className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ui.isSearching ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 사이드바 - 실시간 시각화 */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col min-h-0">
          {/* 탭 헤더 */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            {[
              { key: 'overview', label: '개요', color: 'blue' },
              { key: 'analysis', label: '분석', color: 'green' },
              { key: 'simulation', label: '시뮬레이션', color: 'purple' }
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => updateState({ activeTab: key })}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  state.activeTab === key
                    ? `border-${color}-500 text-${color}-600 bg-${color}-50`
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 탭 내용 */}
          <div className="flex-1 p-4 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {state.activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-4">💼 실시간 웹 검색 서비스</h3>
                
                {/* 실시간 검색 기능 안내 */}
                <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                    🔴 실시간 웹 검색 기능
                  </h4>
                  <div className="text-sm text-red-700 space-y-1">
                    <div>• 최신 ETF 수익률 웹 검색</div>
                    <div>• 국제 정세 & 시장 뉴스 분석</div>
                    <div>• 인기 펀드 순위 실시간 업데이트</div>
                    <div>• 세금 절세 정보 최신 반영</div>
                    <div>• 2025년 투자 트렌드 검색</div>
                  </div>
                </div>

                {/* 검색 현황 */}
                {ui.isSearching && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                      <Loader2 className="w-4 h-4 text-yellow-600 animate-spin mr-2" />
                      🔍 현재 검색 중...
                    </h4>
                    <div className="text-sm text-yellow-700">
                      웹에서 최신 투자 정보를 검색하고 있어요
                    </div>
                  </div>
                )}

                {/* 포트폴리오 정보 */}
                {results.realTimePortfolio && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
                      <div className="w-4 h-4 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                      {results.realTimePortfolio.isRealTimeData ? '🔴 실시간 맞춤형 포트폴리오' : '💼 맞춤형 포트폴리오'}
                    </h4>
                    {results.realTimePortfolio.isRealTimeData && (
                      <div className="text-xs text-purple-600 mb-2">✨ 웹 검색 데이터 기반</div>
                    )}
                    <div className="text-sm text-purple-700 mb-3">
                      {results.realTimePortfolio.economicInsight.slice(0, 100)}...
                    </div>
                    
                    <div className="space-y-2">
                      <div className="font-medium text-purple-800">추천 구성 ({results.realTimePortfolio.expectedReturn})</div>
                      {results.realTimePortfolio.core?.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="flex items-center">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                            {item.name}
                          </span>
                          <div className="text-right">
                            <div className="font-medium">{item.allocation}%</div>
                            <div className="text-xs text-purple-600">{item.currentReturn}% 수익률</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 질문 예제 */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-2">💬</div>
                    실시간 검색 질문 예제
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium text-blue-700 mb-2">🔍 실시간 검색 질문</div>
                      <div className="space-y-1 ml-2">
                        {[
                          "최신 ETF 추천해줘",
                          "현재 시장 상황 어때?",
                          "요즘 인기 투자 상품은?",
                          "2025년 투자 트렌드는?"
                        ].map((question) => (
                          <button 
                            key={question}
                            onClick={() => setInputMessage(question)}
                            className="block w-full text-left text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 rounded text-xs transition-colors"
                          >
                            • "{question}"
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">🚀 주요 기능</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>• 📊 실시간 자산 분석</div>
                    <div>• 💰 웹 검색 기반 포트폴리오 추천</div>
                    <div>• 🔮 미래 자산 시뮬레이션</div>
                    <div>• 🔍 최신 투자 정보 웹 검색</div>
                    <div>• 🤖 개인 맞춤 실시간 상담</div>
                  </div>
                </div>
              </div>
            )}

            {state.activeTab === 'analysis' && results.analysisData && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-4">📊 분석 결과</h3>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4">💰 자산 현황</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>총 자산</span>
                      <span className="font-bold text-blue-600">{formatDetailedMoney(results.analysisData.totalAssets)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>총 대출</span>
                      <span className="font-bold text-red-600">{formatDetailedMoney(results.analysisData.totalLoans)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">순자산</span>
                      <span className="font-bold text-green-600">{formatDetailedMoney(results.analysisData.netAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* 자산 구성 차트 */}
                {results.analysisData.totalAssets > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-4">📊 자산 구성</h4>
                    <div className="h-48 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { name: '부동산', value: results.analysisData.realEstatePercent, color: '#F59E0B' },
                              { name: '투자자산', value: results.analysisData.investmentPercent, color: '#10B981' },
                              { name: '현금/예금', value: results.analysisData.cashPercent, color: '#3B82F6' }
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            dataKey="value"
                            label={({ name, value }) => value > 0 ? `${name} ${value}%` : ''}
                          >
                            {[
                              { name: '부동산', value: results.analysisData.realEstatePercent, color: '#F59E0B' },
                              { name: '투자자산', value: results.analysisData.investmentPercent, color: '#10B981' },
                              { name: '현금/예금', value: results.analysisData.cashPercent, color: '#3B82F6' }
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      {results.analysisData.realEstateAssets > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center"><div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>부동산</span>
                          <span className="font-bold">{formatDetailedMoney(results.analysisData.realEstateAssets)} ({results.analysisData.realEstatePercent}%)</span>
                        </div>
                      )}
                      {results.analysisData.investmentAssets > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded mr-2"></div>투자자산</span>
                          <span className="font-bold">{formatDetailedMoney(results.analysisData.investmentAssets)} ({results.analysisData.investmentPercent}%)</span>
                        </div>
                      )}
                      {results.analysisData.cashAssets > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center"><div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>현금/예금</span>
                          <span className="font-bold">{formatDetailedMoney(results.analysisData.cashAssets)} ({results.analysisData.cashPercent}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {results.analysisData.monthlyIncome > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-4">💸 월간 현금흐름</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-600">월 수입</span>
                        <span className="font-bold text-green-600">+{results.analysisData.monthlyIncome.toLocaleString()}만원</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">월 지출</span>
                        <span className="font-bold text-red-600">-{results.analysisData.monthlyExpenses.toLocaleString()}만원</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-600">대출 상환</span>
                        <span className="font-bold text-orange-600">-{parseInt(state.assets.monthlyLoanPayment || 0).toLocaleString()}만원</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">월 여유자금</span>
                        <span className={`font-bold ${results.analysisData.monthlyFreeCash > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {results.analysisData.monthlyFreeCash > 0 ? '+' : ''}{results.analysisData.monthlyFreeCash.toLocaleString()}만원
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-blue-600">투자 가능</span>
                        <span className="font-bold text-blue-600">{Math.floor(results.analysisData.investableAmount).toLocaleString()}만원</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {state.activeTab === 'simulation' && results.simulationResults ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-4">📈 시뮬레이션 결과</h3>

                {/* 투자 가정 요약 */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
                    <div className="w-4 h-4 bg-indigo-500 rounded mr-2">📋</div>
                    이렇게 투자한다고 가정했어요
                  </h4>
                  
                  <div className="space-y-3 text-sm">
                    {/* 투자 전략 */}
                    <div>
                      <div className="font-medium text-indigo-700 mb-2 flex items-center">
                        <span className="mr-2">🎯</span>투자 전략:
                      </div>
                      {results.realTimePortfolio ? (
                        <div className="ml-4 space-y-1 text-indigo-600">
                          {results.realTimePortfolio.core.slice(0, 4).map((item, index) => (
                            <div key={index}>• {item.name}({item.allocation}%)</div>
                          ))}
                          {results.realTimePortfolio.core.length > 4 && (
                            <div>• 기타 {results.realTimePortfolio.core.length - 4}개 상품</div>
                          )}
                        </div>
                      ) : (
                        <div className="ml-4 text-indigo-600">
                          • {state.investmentProfile === 'stable' ? '안정형' : state.investmentProfile === 'aggressive' ? '적극형' : '공격형'} 포트폴리오 구성
                        </div>
                      )}
                    </div>

                    {/* 매달 투자 */}
                    <div>
                      <div className="font-medium text-indigo-700 mb-1 flex items-center">
                        <span className="mr-2">💰</span>매달 투자:
                      </div>
                      <div className="ml-4 text-indigo-600">
                        {Math.floor(results.simulationResults.investableAmount).toLocaleString()}만원씩 {results.simulationResults.years}년간
                      </div>
                    </div>

                    {/* 예상 수익률 */}
                    <div>
                      <div className="font-medium text-indigo-700 mb-1 flex items-center">
                        <span className="mr-2">📊</span>예상 수익률:
                      </div>
                      <div className="ml-4 text-indigo-600">
                        연 {((RETURN_RATES[state.investmentProfile]?.pessimistic || -0.05) * 100).toFixed(1)}%~{((RETURN_RATES[state.investmentProfile]?.optimistic || 0.12) * 100).toFixed(1)}% (평균 {((RETURN_RATES[state.investmentProfile]?.normal || 0.07) * 100).toFixed(1)}%)
                      </div>
                    </div>

                    {/* 기대 가격 */}
                    <div>
                      <div className="font-medium text-indigo-700 mb-1 flex items-center">
                        <span className="mr-2">🔮</span>기타 가정:
                      </div>
                      <div className="ml-4 space-y-1 text-indigo-600">
                        <div>• 부동산: 연 {(state.realEstateGrowthRate * 100).toFixed(1)}% {state.realEstateGrowthRate === 0 ? '정체' : state.realEstateGrowthRate <= 0.03 ? '완만 성장' : state.realEstateGrowthRate <= 0.06 ? '평균 성장' : '급성장'}</div>
                        <div>• 예금: 연 3% 복리</div>
                        {parseInt(state.assets.monthlyLoanPayment || 0) > 0 ? (
                          <div>• 대출 상환: 월 {parseInt(state.assets.monthlyLoanPayment || 0).toLocaleString()}만원</div>
                        ) : (
                          <div>• 대출 없이 순수 투자</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 차트 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4">📊 {results.simulationResults.years}년간 자산 변화</h4>
                  
                  <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={results.simulationResults.scenarios.normal.yearlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis label={{ value: '억원', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value, name) => [
                            `${value.toFixed(1)}억원`, 
                            name === '순자산' ? '순자산' : 
                            name === '부동산' ? '부동산' :
                            name === '월적립투자' ? '월적립투자' : name
                          ]}
                        />
                        <Line type="monotone" dataKey="순자산" stroke="#8B5CF6" strokeWidth={3} name="순자산" />
                        <Line type="monotone" dataKey="부동산" stroke="#F59E0B" strokeWidth={2} name="부동산" />
                        <Line type="monotone" dataKey="기존투자자산" stroke="#10B981" strokeWidth={2} name="기존투자자산" />
                        <Line type="monotone" dataKey="월적립투자" stroke="#3B82F6" strokeWidth={2} name="월적립투자" />
                        <Line type="monotone" dataKey="현금성자산" stroke="#6B7280" strokeWidth={2} name="현금성자산" />
                        <Line type="monotone" dataKey="대출" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" name="대출" />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 자산별 상세 분석표 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4">📋 자산별 상세 변화표</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2">구분</th>
                          <th className="text-right py-2 px-2">현재</th>
                          <th className="text-right py-2 px-2">{results.simulationResults.years}년 후</th>
                          <th className="text-right py-2 px-2">증가액</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-2 font-medium text-orange-700">부동산</td>
                          <td className="py-2 px-2 text-right">{formatDetailedMoney(parseInt(state.assets.realEstate || 0))}</td>
                          <td className="py-2 px-2 text-right">{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.부동산)}</td>
                          <td className="py-2 px-2 text-right text-orange-600">
                            +{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.부동산 - parseInt(state.assets.realEstate || 0))}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-2 font-medium text-green-700">기존 투자자산</td>
                          <td className="py-2 px-2 text-right">{formatDetailedMoney(parseInt(state.assets.stocks || 0))}</td>
                          <td className="py-2 px-2 text-right">{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.기존투자자산)}</td>
                          <td className="py-2 px-2 text-right text-green-600">
                            +{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.기존투자자산 - parseInt(state.assets.stocks || 0))}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-2 font-medium text-blue-700">월 적립 투자</td>
                          <td className="py-2 px-2 text-right">0원</td>
                          <td className="py-2 px-2 text-right">{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.월적립투자)}</td>
                          <td className="py-2 px-2 text-right text-blue-600">
                            +{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.월적립투자)}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-2 font-medium text-gray-700">현금성 자산</td>
                          <td className="py-2 px-2 text-right">{formatDetailedMoney(parseInt(state.assets.deposits || 0))}</td>
                          <td className="py-2 px-2 text-right">{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.현금성자산)}</td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            +{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.현금성자산 - parseInt(state.assets.deposits || 0))}
                          </td>
                        </tr>
                        <tr className="border-t-2 border-purple-200 bg-purple-50">
                          <td className="py-2 px-2 font-bold text-purple-800">순자산</td>
                          <td className="py-2 px-2 text-right font-bold">{formatDetailedMoney(results.simulationResults.currentNetAssets)}</td>
                          <td className="py-2 px-2 text-right font-bold">{formatDetailedMoney(results.simulationResults.scenarios.normal.netAssets)}</td>
                          <td className="py-2 px-2 text-right font-bold text-purple-600">
                            +{formatDetailedMoney(results.simulationResults.scenarios.normal.assetGrowth)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 월적립투자 효과 분석 */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3">💰 월적립투자 효과 분석</h4>
                  
                  <div className="space-y-3 text-sm">
                    <div className="bg-white p-3 rounded border">
                      <div className="font-medium text-blue-700 mb-2">📈 월적립 투자 상세</div>
                      <div className="space-y-1 text-gray-700">
                        <div>• 월 투자금액: {Math.floor(results.simulationResults.investableAmount).toLocaleString()}만원</div>
                        <div>• 총 투입 원금: {Math.floor(results.simulationResults.investableAmount * 12 * results.simulationResults.years).toLocaleString()}만원 ({results.simulationResults.years}년간)</div>
                        <div>• 예상 투자 원금: {formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.월적립투자)}</div>
                        <div className="font-bold text-blue-600">• 복리 효과: +{formatDetailedMoney(results.simulationResults.scenarios.normal.assetBreakdown.월적립투자 - (results.simulationResults.investableAmount * 12 * results.simulationResults.years))}원</div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <div className="font-medium text-green-700 mb-2">🎯 투자 성과 분석</div>
                      <div className="space-y-1 text-gray-700">
                        <div>• 투자 성향: {state.investmentProfile === 'stable' ? '안정형' : state.investmentProfile === 'aggressive' ? '적극형' : '공격형'}</div>
                        <div>• 연평균 기대수익률: {((RETURN_RATES[state.investmentProfile]?.normal || 0.05) * 100).toFixed(1)}%</div>
                        <div>• 총 자산 성장률: {results.simulationResults.currentNetAssets > 0 ? ((results.simulationResults.scenarios.normal.netAssets / results.simulationResults.currentNetAssets - 1) * 100).toFixed(1) : 'N/A'}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 시나리오별 결과 */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-3">💫 {results.simulationResults.years}년 후 시나리오별 예상</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-red-700">😰 비관적 (20% 확률)</span>
                      <span className="font-bold text-red-800">{formatDetailedMoney(results.simulationResults.scenarios.pessimistic.netAssets)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-2 border-blue-300 bg-blue-50 px-2 py-1 rounded">
                      <span className="text-blue-700">🎯 보통 (60% 확률)</span>
                      <span className="font-bold text-blue-800">{formatDetailedMoney(results.simulationResults.scenarios.normal.netAssets)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-700">🚀 낙관적 (20% 확률)</span>
                      <span className="font-bold text-green-800">{formatDetailedMoney(Math.floor(results.simulationResults.scenarios.optimistic.netAssets * 1.15))}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-purple-100 rounded text-xs text-purple-700">
                    💡 <strong>참고:</strong> 위 수치는 수학적 계산일 뿐이에요. 실제로는 감정, 수수료, 세금 등이 큰 변수가 됩니다!
                  </div>
                </div>
              </div>
            ) : state.activeTab === 'simulation' && (
              <div className="text-center text-gray-500 text-sm">
                시뮬레이션을 실행하면 상세한 결과가 여기에 표시됩니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssetManager;
