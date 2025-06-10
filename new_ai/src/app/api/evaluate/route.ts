import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

type RequestBody = {
  resume: string;
  jobDescription: string;
};

export async function POST(req: Request) {
  try {
    const { resume, jobDescription } = await req.json() as RequestBody;

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Resume and job description are required' },
        { status: 400 }
      );
    }

    console.log('🤖 STARTING REAL GEMINI AI EVALUATION');
    console.log('📊 Input lengths - Resume:', resume.length, 'Job:', jobDescription.length);    try {
      // Check if API key is provided
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_NEW_GEMINI_API_KEY_HERE') {
        throw new Error('Gemini API key is not configured. Please add a valid GEMINI_API_KEY to your .env.local file.');
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });      const prompt = `Evaluate this resume against the job description and provide detailed analysis.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}

Please provide your evaluation in the following JSON format. Keep feedback and suggestions as plain text without markdown formatting:
{
  "score": 0.85,
  "feedback": "Detailed assessment paragraph explaining the overall match. Use plain text only.",
  "suggestions": "Detailed suggestions for improvement with specific actionable items. Use plain text only.",
  "presentKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword3", "keyword4"]
}

CRITICAL KEYWORD EXTRACTION RULES:
1. FIRST, identify all important keywords, skills, technologies, tools, and qualifications mentioned in the JOB DESCRIPTION
2. THEN, for each keyword from the job description, check if it appears in the resume
3. "presentKeywords": Include ONLY those keywords that are:
   - Explicitly mentioned in the JOB DESCRIPTION
   - AND also found in the RESUME (exact match or very close synonym)
4. "missingKeywords": Include ONLY those keywords that are:
   - Explicitly mentioned in the JOB DESCRIPTION  
   - BUT NOT found in the RESUME
5. DO NOT include any skills or keywords that are only in the resume but not mentioned in the job description
6. DO NOT infer or generalize - only use keywords that are clearly stated in the job description

ADDITIONAL INSTRUCTIONS:
- Score should be between 0 and 1
- Do NOT include the same keyword in both arrays
- Be specific and actionable in your feedback and suggestions
- Do not use markdown formatting like ** or * in the feedback and suggestions fields
- Focus on technical skills, tools, technologies, and important job-related terms for keywords`;console.log('⏳ Sending request to Gemini API...');
      console.log('📏 Prompt length:', prompt.length);
      console.log('🔑 API Key preview:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
      
      const startTime = Date.now();
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const endTime = Date.now();
      console.log('✅ GEMINI AI EVALUATION COMPLETE!');
      console.log('⏱️ API Response time:', endTime - startTime, 'ms');
      console.log('📝 Raw AI response preview:', text.substring(0, 200) + '...');
      
      // Extract and clean JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('❌ No JSON found in AI response');
        console.log('📝 Full response:', text);
        throw new Error('Invalid response format from AI');
      }
      
      let cleanedJson = jsonMatch[0];
      let evaluation;
      
      // Clean up common JSON issues
      try {
        // Remove any trailing commas before closing brackets/braces
        cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix quotes in array elements
        cleanedJson = cleanedJson.replace(/(["\w]+)\s*:\s*\[(.*?)\]/g, (match, key, arrayContent) => {
          if (key.includes('Keywords') || key.includes('keywords')) {
            // Clean up keyword arrays specifically
            const cleaned = arrayContent
              .split(',')
              .map((item: string) => item.trim().replace(/^["']|["']$/g, ''))
              .filter((item: string) => item.length > 0)
              .map((item: string) => `"${item}"`)
              .join(', ');
            return `${key}: [${cleaned}]`;
          }
          return match;
        });
        
        console.log('🔧 Cleaned JSON preview:', cleanedJson.substring(0, 300) + '...');
        
        evaluation = JSON.parse(cleanedJson);
        console.log('✅ Successfully parsed AI evaluation');
        console.log('📊 Evaluation score:', evaluation.score);
        
      } catch (parseError) {
        console.log('❌ JSON parse error after cleaning:', parseError);
        console.log('📝 Cleaned JSON that failed:', cleanedJson);
        
        // Fallback: try to extract individual fields
        const scoreMatch = text.match(/"score":\s*([\d.]+)/);
        const feedbackMatch = text.match(/"feedback":\s*"([^"]*(?:"[^"]*"[^"]*)*)"/);
        const suggestionsMatch = text.match(/"suggestions":\s*"([^"]*(?:"[^"]*"[^"]*)*)"/);
        const presentKeywordsMatch = text.match(/"presentKeywords":\s*\[(.*?)\]/);
        const missingKeywordsMatch = text.match(/"missingKeywords":\s*\[(.*?)\]/);
        
        evaluation = {
          score: scoreMatch ? parseFloat(scoreMatch[1]) : 0.5,
          feedback: feedbackMatch ? feedbackMatch[1] : "Unable to parse detailed feedback from AI response.",
          suggestions: suggestionsMatch ? suggestionsMatch[1] : "Unable to parse suggestions from AI response.",
          presentKeywords: presentKeywordsMatch ? 
            presentKeywordsMatch[1].split(',').map(k => k.trim().replace(/['"]/g, '')).filter(k => k.length > 0) : 
            [],
          missingKeywords: missingKeywordsMatch ? 
            missingKeywordsMatch[1].split(',').map(k => k.trim().replace(/['"]/g, '')).filter(k => k.length > 0) : 
            ["technical-skills", "experience"]
        };
        
        console.log('🔄 Using fallback parsing result');
      }
      
      // Add timestamp to prove it's real AI
      evaluation.aiTimestamp = new Date().toISOString();
      evaluation.responseTime = endTime - startTime;
      
      return NextResponse.json(evaluation);

    } catch (aiError) {
      console.error('❌ GEMINI AI EVALUATION ERROR:', aiError);
      throw aiError;
    }

  } catch (error) {
    console.error('Error evaluating resume:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate resume', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
