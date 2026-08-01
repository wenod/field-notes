import fs from "node:fs";
import path from "node:path";
import {
  findPublicSafetyViolation,
  redactPublicContactDetails,
} from "./public-safety.mjs";

const privateSourcePath = path.resolve(process.cwd(), "../posts.jsonl");
const sampleSourcePath = path.resolve(process.cwd(), "examples/posts.sample.jsonl");
const publicIndexPath = path.resolve(process.cwd(), "public/data/bookmarks.public.json");
const publicEdition = process.env.BOOKMARKS_PUBLIC === "1";
const useCheckedInPublicIndex = !process.env.BOOKMARKS_SOURCE
  && !process.env.BOOKMARKS_OUTPUT
  && !fs.existsSync(privateSourcePath)
  && fs.existsSync(publicIndexPath);

if (useCheckedInPublicIndex) {
  console.log("Using the checked-in audited public bookmark index.");
  process.exit(0);
}

const sourcePath = process.env.BOOKMARKS_SOURCE
  ? path.resolve(process.cwd(), process.env.BOOKMARKS_SOURCE)
  : fs.existsSync(privateSourcePath) ? privateSourcePath : sampleSourcePath;
const outputPath = process.env.BOOKMARKS_OUTPUT
  ? path.resolve(process.cwd(), process.env.BOOKMARKS_OUTPUT)
  : path.resolve(process.cwd(), "public/data/bookmarks.json");

const shelfDefinitions = [
  {
    name: "AI & Intelligence",
    description: "Models, agents, AI-assisted building, retrieval, evaluation and generative media.",
    topics: [
      ["Agents & Automation", [[/\bagentic\b/i, 4], [/\b(?:ai|llm) agents?\b/i, 4], [/\bmulti[- ]agent\b/i, 4], [/\btool (?:use|calling)\b/i, 4], [/\bmcp\b/i, 3], [/\bmodel context protocol\b/i, 5], [/\bcomputer use\b/i, 3], [/\bautonomous agents?\b/i, 4], [/\borchestrat(?:e|ion|or)\b/i, 2], [/\bworkflow automation\b/i, 3]]],
      ["AI Coding", [[/\bclaude code\b/i, 5], [/\bcodex\b/i, 4], [/\bcursor (?:ai|editor|ide)\b/i, 5], [/\bgithub copilot\b/i, 5], [/\bai (?:coding|code|programming|developer)\b/i, 4], [/\bvibe cod(?:e|ing)\b/i, 4], [/\bcoding agents?\b/i, 4], [/\bcodegen\b/i, 3], [/\bbolt\.new\b/i, 4], [/\blovable\b/i, 3], [/\breplit agent\b/i, 4]]],
      ["Models & Reasoning", [[/\bllms?\b/i, 4], [/\blarge language models?\b/i, 5], [/\b(?:gpt[- ]?[2345o]?|chatgpt)\b/i, 4], [/\bclaude(?:\s?\d(?:\.\d)?)?\b/i, 4], [/\bgemini(?:\s?\d(?:\.\d)?)?\b/i, 4], [/\bdeepseek\b/i, 4], [/\bqwen\b/i, 4], [/\bllama\s?\d*\b/i, 4], [/\bmistral\b/i, 3], [/\bchain of thought\b/i, 4], [/\breasoning models?\b/i, 4], [/\btest[- ]time compute\b/i, 4], [/\bmixture of experts\b/i, 4]]],
      ["Prompting & Context", [[/\bprompt engineering\b/i, 5], [/\bsystem prompts?\b/i, 4], [/\bprompts?\b/i, 2], [/\bcontext windows?\b/i, 4], [/\bcontext engineering\b/i, 5], [/\bfew[- ]shot\b/i, 3], [/\bin[- ]context learning\b/i, 4], [/\bprompt injection\b/i, 4], [/\bclaude\.md\b/i, 4], [/\bagents?\.md\b/i, 4]]],
      ["Retrieval & Knowledge", [[/\brag\b/i, 5], [/\bretrieval[- ]augmented\b/i, 5], [/\bembeddings?\b/i, 4], [/\bvector (?:db|database|search|store)\b/i, 4], [/\bsemantic search\b/i, 4], [/\bknowledge graphs?\b/i, 3], [/\bchunking\b/i, 3], [/\brerank(?:er|ing)?\b/i, 4], [/\bgraph rag\b/i, 5]]],
      ["Training & Fine-tuning", [[/\bfine[- ]tun(?:e|ing)\b/i, 4], [/\btraining (?:an? )?(?:llm|model|transformer)\b/i, 4], [/\bpre[- ]training\b/i, 3], [/\bpost[- ]training\b/i, 4], [/\brlhf\b/i, 5], [/\bdpo\b/i, 3], [/\blora\b/i, 3], [/\bsynthetic data\b/i, 4], [/\bdistill(?:ed|ation|ing)\b/i, 3], [/\breinforcement learning\b/i, 4]]],
      ["Inference & Evaluation", [[/\bllm evals?\b/i, 5], [/\bmodel evals?\b/i, 4], [/\bbenchmarks?\b/i, 2], [/\binference\b/i, 3], [/\bquantiz(?:e|ed|ation)\b/i, 4], [/\btokeniz(?:er|ation)\b/i, 4], [/\bguardrails?\b/i, 3], [/\bhallucinat(?:e|ion|ions)\b/i, 3], [/\bobservability\b/i, 2], [/\blangsmith\b/i, 4], [/\bopenrouter\b/i, 4], [/\bvllm\b/i, 4]]],
      ["Multimodal & Generation", [[/\bmultimodal\b/i, 4], [/\btext[- ]to[- ](?:image|video|speech|music)\b/i, 4], [/\bimage generation\b/i, 4], [/\bvideo generation\b/i, 4], [/\bvoice (?:ai|cloning)\b/i, 4], [/\bstable diffusion\b/i, 5], [/\bmidjourney\b/i, 5], [/\bdall[- ]?e\b/i, 5], [/\bsora\b/i, 4], [/\bveo\s?\d*\b/i, 4], [/\bnano banana\b/i, 5], [/\bwhisper\b/i, 3], [/\bdiffusion models?\b/i, 4]]],
      ["AI Products & Research", [[/\bgenerative ai\b/i, 5], [/\bgenai\b/i, 5], [/\bartificial intelligence\b/i, 4], [/\bmachine intelligence\b/i, 3], [/\bai research\b/i, 4], [/\bopenai\b/i, 4], [/\banthropic\b/i, 4], [/\bhugging ?face\b/i, 4], [/\bai (?:tool|product|app|startup|assistant|chatbot|model)s?\b/i, 3], [/#ai\b/i, 3], [/\bchatbots?\b/i, 2]]],
      ["AI Safety & Governance", [[/\bai safety\b/i, 5], [/\bai alignment\b/i, 5], [/\bmodel alignment\b/i, 4], [/\bresponsible ai\b/i, 4], [/\bai governance\b/i, 4], [/\bai regulation\b/i, 4], [/\bmodel security\b/i, 3], [/\bjailbreak(?:ing|s)?\b/i, 3]]],
    ],
  },
  {
    name: "Software Craft",
    description: "Languages, frameworks, software design, developer tools and the practice of building well.",
    topics: [
      ["Languages & Runtime", [[/\btypescript\b/i, 4], [/\bjavascript\b/i, 4], [/\bpython\b/i, 4], [/\brust(?:lang)?\b/i, 4], [/\bgolang\b/i, 4], [/\bgo language\b/i, 4], [/\bjava\b/i, 3], [/\bkotlin\b/i, 4], [/\bswift(?:ui)?\b/i, 4], [/\bc\+\+\b/i, 4], [/\bc#\b/i, 4], [/\b(?:ruby|rails|php|elixir|erlang|haskell|clojure|scala)\b/i, 3], [/\bnode\.?(?:js)?\b/i, 4], [/\bdeno\b/i, 4], [/\bbun\b/i, 3], [/\bwebassembly\b/i, 4], [/\bwasm\b/i, 4]]],
      ["Web & App Development", [[/\breact(?:\.js|js)?\b/i, 4], [/\bnext\.js\b/i, 4], [/\bvue(?:\.js|js)?\b/i, 4], [/\bsvelte\b/i, 4], [/\bangular\b/i, 3], [/\bfrontend\b/i, 3], [/\bfront[- ]end\b/i, 3], [/\bweb dev(?:elopment)?\b/i, 3], [/\bweb apps?\b/i, 2], [/\bhtml5?\b/i, 3], [/\bcss\b/i, 3], [/\btailwind\b/i, 3], [/\bflutter\b/i, 4], [/\breact native\b/i, 4], [/\bios (?:app|development|developer)\b/i, 3], [/\bandroid (?:app|development|developer)\b/i, 3], [/\bprogressive web app\b/i, 4]]],
      ["Architecture & APIs", [[/\bsoftware architecture\b/i, 5], [/\bsystem design\b/i, 5], [/\barchitectural patterns?\b/i, 4], [/\bmicroservices?\b/i, 4], [/\bmonolith(?:ic)?\b/i, 3], [/\bevent[- ]driven\b/i, 4], [/\bserverless\b/i, 4], [/\brest(?:ful)? api\b/i, 4], [/\bgraphql\b/i, 4], [/\bwebhooks?\b/i, 3], [/\bapi(?:s| gateway| design| endpoint)?\b/i, 2], [/\bdesign patterns?\b/i, 3], [/\bdomain[- ]driven design\b/i, 4], [/\bclean architecture\b/i, 4], [/\bbackend\b/i, 3]]],
      ["Developer Tools", [[/\bgithub\b/i, 3], [/\bgitlab\b/i, 3], [/\bgit\b/i, 3], [/\bcommand line\b/i, 3], [/\bterminal\b/i, 3], [/\bcli\b/i, 4], [/\bvs ?code\b/i, 4], [/\bvim\b/i, 3], [/\bneovim\b/i, 4], [/\bide\b/i, 3], [/\bdeveloper tools?\b/i, 4], [/\bdevtools\b/i, 4], [/\bdebugg(?:er|ing)\b/i, 3], [/\bpackage manager\b/i, 3], [/\bnpm\b/i, 3], [/\bopen[- ]source\b/i, 3], [/\bsource code\b/i, 2]]],
      ["Testing & Quality", [[/\bunit tests?\b/i, 4], [/\bintegration tests?\b/i, 4], [/\bend[- ]to[- ]end tests?\b/i, 4], [/\btest[- ]driven\b/i, 4], [/\btesting (?:code|software|apps?)\b/i, 3], [/\bplaywright\b/i, 4], [/\bselenium\b/i, 4], [/\bvitest\b/i, 4], [/\bjest\b/i, 3], [/\bcode review\b/i, 4], [/\bstatic analysis\b/i, 4], [/\blint(?:er|ing)?\b/i, 3], [/\btype safety\b/i, 3]]],
      ["Performance & Reliability", [[/\bperformance optimiz(?:e|ation|ing)\b/i, 4], [/\blatency\b/i, 3], [/\bprofil(?:e|er|ing)\b/i, 3], [/\bmemory leak\b/i, 4], [/\bload test(?:ing)?\b/i, 4], [/\bfault toleran(?:t|ce)\b/i, 4], [/\breliability engineering\b/i, 4], [/\bsite reliability\b/i, 4], [/\bsre\b/i, 3], [/\bincident response\b/i, 3], [/\bpostmortem\b/i, 3], [/\bobservability\b/i, 3]]],
      ["Product & Interface", [[/\buser experience\b/i, 4], [/\bux\b/i, 3], [/\bui design\b/i, 4], [/\bproduct design\b/i, 4], [/\bdesign systems?\b/i, 4], [/\baccessibility\b/i, 4], [/\ba11y\b/i, 4], [/\binteraction design\b/i, 4], [/\buser research\b/i, 3], [/\bproduct management\b/i, 3], [/\bproduct managers?\b/i, 3], [/\bonboarding flow\b/i, 3], [/\bprototyp(?:e|ing)\b/i, 3], [/\bfigma\b/i, 3]]],
    ],
  },
  {
    name: "Systems & Infrastructure",
    description: "Cloud, databases, distributed systems, security, networking and computing hardware.",
    topics: [
      ["Cloud & DevOps", [[/\bdevops\b/i, 4], [/\bkubernetes\b/i, 5], [/\bk8s\b/i, 4], [/\bdocker\b/i, 4], [/\bcontainers?\b/i, 2], [/\bterraform\b/i, 4], [/\bansible\b/i, 4], [/\bcontinuous integration\b/i, 4], [/\bci\/?cd\b/i, 4], [/\bgithub actions\b/i, 4], [/\bcloudflare\b/i, 3], [/\baws\b/i, 4], [/\bamazon web services\b/i, 5], [/\bazure\b/i, 4], [/\bgcp\b/i, 3], [/\bgoogle cloud\b/i, 4], [/\bvercel\b/i, 3], [/\bcloud infrastructure\b/i, 4]]],
      ["Databases & Data Systems", [[/\bpostgres(?:ql)?\b/i, 5], [/\bmysql\b/i, 4], [/\bsqlite\b/i, 4], [/\bsql\b/i, 3], [/\bdatabases?\b/i, 3], [/\bredis\b/i, 4], [/\bmongodb\b/i, 4], [/\bclickhouse\b/i, 4], [/\bduckdb\b/i, 4], [/\bsupabase\b/i, 4], [/\bdata warehouse\b/i, 4], [/\bdata lake\b/i, 4], [/\betl\b/i, 3], [/\bdata pipelines?\b/i, 4], [/\bquery optimiz(?:e|ation|ing)\b/i, 4], [/\bdatabase index(?:es|ing)?\b/i, 4]]],
      ["Distributed Systems", [[/\bdistributed systems?\b/i, 5], [/\bconsensus algorithm\b/i, 5], [/\braft\b/i, 3], [/\bpaxos\b/i, 4], [/\bkafka\b/i, 4], [/\bmessage queues?\b/i, 4], [/\bevent streams?\b/i, 3], [/\bdistributed database\b/i, 4], [/\bcap theorem\b/i, 5], [/\beventual consistency\b/i, 5], [/\breplication\b/i, 3], [/\bsharding\b/i, 4], [/\bload balanc(?:er|ing)\b/i, 4]]],
      ["Security & Privacy", [[/\bcyber ?security\b/i, 5], [/\binfosec\b/i, 5], [/\bapplication security\b/i, 4], [/\bsecurity engineer\b/i, 4], [/\bvulnerabilit(?:y|ies)\b/i, 3], [/\bcve[- ]?\d*/i, 4], [/\bzero[- ]day\b/i, 4], [/\bmalware\b/i, 4], [/\bransomware\b/i, 4], [/\bphishing\b/i, 3], [/\bcryptograph(?:y|ic)\b/i, 4], [/\bencryption\b/i, 3], [/\bauthentication\b/i, 3], [/\boauth\b/i, 4], [/\bpasswords?\b/i, 2], [/\bprivacy engineering\b/i, 4], [/\breverse engineer(?:ing)?\b/i, 4], [/\bexploit\b/i, 3]]],
      ["Networking & Internet", [[/\bcomputer networks?\b/i, 4], [/\bnetwork protocols?\b/i, 4], [/\btcp\/?ip\b/i, 5], [/\bhttp\/?[123]?\b/i, 3], [/\bdns\b/i, 4], [/\bwebsockets?\b/i, 4], [/\bwebrtc\b/i, 4], [/\bcdn\b/i, 3], [/\bnetworking\b/i, 3], [/\bipv[46]\b/i, 4], [/\bssh\b/i, 3], [/\bvpn\b/i, 3], [/\bbandwidth\b/i, 2]]],
      ["Hardware & Chips", [[/\bgpus?\b/i, 4], [/\bnvidia\b/i, 4], [/\bamd\b/i, 3], [/\bsemiconductors?\b/i, 4], [/\bmicrochips?\b/i, 4], [/\bchip design\b/i, 4], [/\bcpus?\b/i, 3], [/\bprocessors?\b/i, 2], [/\bapple silicon\b/i, 4], [/\braspberry pi\b/i, 4], [/\barduino\b/i, 4], [/\bmicrocontrollers?\b/i, 4], [/\bfpgas?\b/i, 4], [/\bcuda\b/i, 5], [/\btpus?\b/i, 3], [/\bhardware acceleration\b/i, 4]]],
      ["Operating Systems", [[/\blinux\b/i, 4], [/\bunix\b/i, 4], [/\bmacos\b/i, 3], [/\bwindows (?:kernel|terminal|subsystem|server)\b/i, 3], [/\boperating systems?\b/i, 4], [/\bkernels?\b/i, 3], [/\bfile systems?\b/i, 4], [/\bshell scripting\b/i, 4], [/\bbash\b/i, 3], [/\bzsh\b/i, 4], [/\bsystem calls?\b/i, 4]]],
    ],
  },
  {
    name: "Data & Machine Learning",
    description: "Classical ML, analytics, vision, language systems, search and practical data work.",
    topics: [
      ["Machine Learning", [[/\bmachine learning\b/i, 5], [/#machinelearning\b/i, 5], [/\bdeep learning\b/i, 5], [/\bneural networks?\b/i, 5], [/\btransformers?\b/i, 3], [/\bsupervised learning\b/i, 4], [/\bunsupervised learning\b/i, 4], [/\bfeature engineering\b/i, 4], [/\bgradient descent\b/i, 4], [/\bclassification model\b/i, 4], [/\bregression model\b/i, 4], [/\bscikit[- ]learn\b/i, 4], [/\bpytorch\b/i, 5], [/\btensorflow\b/i, 5], [/\bkeras\b/i, 4]]],
      ["Data Science & Analytics", [[/\bdata science\b/i, 5], [/\bdata analys(?:is|t|ytics)\b/i, 4], [/\bdata visualiz(?:e|ation|ing)\b/i, 4], [/\bpandas\b/i, 3], [/\bnumpy\b/i, 3], [/\bjupyter\b/i, 4], [/\bnotebooks?\b/i, 2], [/\btableau\b/i, 3], [/\bpower bi\b/i, 4], [/\bmatplotlib\b/i, 4], [/\bdbt\b/i, 3], [/\bbig data\b/i, 3]]],
      ["Computer Vision", [[/\bcomputer vision\b/i, 5], [/\bimage recognition\b/i, 4], [/\bobject detection\b/i, 4], [/\bimage segmentation\b/i, 4], [/\bopencv\b/i, 5], [/\bocr\b/i, 4], [/\bvision models?\b/i, 4], [/\bconvolutional neural\b/i, 4], [/\bcnn (?:model|models|architecture|architectures|classifier|classifiers|neural network|neural networks)\b/i, 4]]],
      ["Language & Speech", [[/\bnatural language processing\b/i, 5], [/\bnlp\b/i, 4], [/\bspeech recognition\b/i, 4], [/\btext[- ]to[- ]speech\b/i, 4], [/\bautomatic speech\b/i, 4], [/\blanguage models?\b/i, 4], [/\bsentiment analysis\b/i, 3], [/\bnamed entity recognition\b/i, 4]]],
      ["Search & Recommendation", [[/\bsearch engines?\b/i, 4], [/\binformation retrieval\b/i, 5], [/\brecommendation systems?\b/i, 5], [/\brecommender systems?\b/i, 5], [/\blearning to rank\b/i, 4], [/\belasticsearch\b/i, 4], [/\bsolr\b/i, 4], [/\bfull[- ]text search\b/i, 4]]],
    ],
  },
  {
    name: "Science & Mathematics",
    description: "Mathematics, statistics, natural science, medicine and the methods behind reliable knowledge.",
    topics: [
      ["Mathematics & Statistics", [[/\bmathematics?\b/i, 4], [/\bstatistics?\b/i, 3], [/\bprobability\b/i, 3], [/\blinear algebra\b/i, 5], [/\bcalculus\b/i, 4], [/\bgeometry\b/i, 3], [/\bnumber theory\b/i, 4], [/\btopology\b/i, 4], [/\bmathematical proof\b/i, 4], [/\bbayesian\b/i, 4], [/\bcausal inference\b/i, 4], [/\bstatistical significance\b/i, 4], [/\bcombinatorics\b/i, 4]]],
      ["Physics & Space", [[/\bphysics\b/i, 4], [/\bquantum\b/i, 4], [/\brelativity\b/i, 3], [/\bastrophysic(?:s|ist)\b/i, 4], [/\bastronomy\b/i, 4], [/\bcosmology\b/i, 4], [/\bspacecraft\b/i, 3], [/\bnasa\b/i, 4], [/\bspacex\b/i, 3], [/\bblack holes?\b/i, 4], [/\bparticle physics\b/i, 4], [/\bnuclear fusion\b/i, 4], [/\bthermodynamics\b/i, 4]]],
      ["Biology & Medicine", [[/\bbiology\b/i, 4], [/\bbiotech(?:nology)?\b/i, 4], [/\bgenomics?\b/i, 4], [/\bgenetics?\b/i, 3], [/\bneuroscience\b/i, 4], [/\bclinical trials?\b/i, 4], [/\bmedical research\b/i, 4], [/\bmedicine\b/i, 3], [/\bcancer (?:research|treatment|cells?|therapy)\b/i, 4], [/\bvaccin(?:e|es|ation)\b/i, 3], [/\bimmunology\b/i, 4], [/\bprotein folding\b/i, 4], [/\bcrispr\b/i, 5], [/\bmicrobiom(?:e|es)\b/i, 4], [/\bepidemiolog(?:y|ical)\b/i, 4]]],
      ["Climate & Earth", [[/\bclimate science\b/i, 5], [/\bclimate change\b/i, 3], [/\bglobal warming\b/i, 3], [/\bgeology\b/i, 4], [/\bearth science\b/i, 4], [/\boceanography\b/i, 4], [/\bmeteorology\b/i, 4], [/\brenewable energy\b/i, 3], [/\bsolar energy\b/i, 3], [/\bcarbon emissions?\b/i, 3]]],
      ["Research & Methods", [[/\bscientific method\b/i, 5], [/\bresearch paper\b/i, 4], [/\bpeer review\b/i, 4], [/\bmeta[- ]analysis\b/i, 4], [/\breproducib(?:le|ility)\b/i, 4], [/\bresearchers? (?:found|discover|show|demonstrate)\b/i, 2], [/\bnew study\b/i, 2], [/\bpreprint\b/i, 3], [/\barxiv\b/i, 4], [/\bempirical evidence\b/i, 4], [/\bcontrolled trial\b/i, 4], [/\bscience\b/i, 2], [/\bscientists?\b/i, 2]]],
    ],
  },
];

const technicalDomains = new Map([
  ["github.com", 5], ["gist.github.com", 5], ["arxiv.org", 5], ["huggingface.co", 5],
  ["openai.com", 5], ["anthropic.com", 5], ["ai.google.dev", 5], ["deepmind.google", 5],
  ["stackoverflow.com", 4], ["stackexchange.com", 4], ["dev.to", 4], ["hashnode.dev", 4],
  ["simonwillison.net", 5], ["quantamagazine.org", 4], ["nature.com", 4], ["science.org", 4],
  ["paperswithcode.com", 5], ["kaggle.com", 4], ["pytorch.org", 5], ["tensorflow.org", 5],
  ["npmjs.com", 4], ["crates.io", 4], ["docs.python.org", 5], ["developer.mozilla.org", 5],
  ["aws.amazon.com", 4], ["cloudflare.com", 4], ["vercel.com", 4], ["supabase.com", 4],
  ["postgresql.org", 5], ["infoq.com", 4], ["martinfowler.com", 5], ["krebsonsecurity.com", 5],
  ["techcrunch.com", 2], ["theverge.com", 2], ["techmeme.com", 2], ["wired.com", 2],
]);

const trustedHealthDomains = new Set([
  "nature.com", "science.org", "pubmed.ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov",
  "nih.gov", "cdc.gov", "who.int", "nejm.org", "thelancet.com", "bmj.com",
  "jamanetwork.com", "cell.com", "plos.org", "frontiersin.org", "elifesciences.org",
  "med.stanford.edu",
]);
const healthEvidencePattern = /\b(?:randomi[sz]ed controlled trial|clinical trial|peer[- ]reviewed|systematic review|meta[- ]analysis|study published in|research published in|according to researchers|researchers at|scientists at|controlled trial|prospective study|retrospective study|cohort study|case series|preprint|doi\b)\b/i;

const explicitContentPattern = /\b(pussy|porn(?:ography|ographic)?|onlyfans|nudes?|blowjob|handjob|sex tape|masturbat(?:e|ion)|orgasm|anal sex|xxx)\b/i;
const partisanPoliticsPattern = /\b(elections?|politicians?|parliament|congress party|bjp|narendra modi|rahul gandhi|donald trump|democrats?|republicans?|aam aadmi party|lok sabha|rajya sabha|afd party|geopolitics?)\b/i;
const conflictNewsPattern = /\b(war of aggression|military strike|missile strike|airstrikes?|bombing campaign|(?:country|nation|army|military|troops?|forces?|china|russia|israel|iran|pakistan|india) (?:invades?|invaded|invading)|troops? deployed|ceasefire)\b/i;
const conflictTechnologyPattern = /\b(semiconductors?|chips?|tsmc|technology supply chain|cyber ?security|cyberwarfare|satellite systems?|space program|space programme)\b/i;
const technicalPolicyPattern = /\b(ai|artificial intelligence|large language models?|llms?|data protection|privacy engineering|cyber ?security|semiconductors?|space programme|space program|quantum technology|biotech policy|r&d funding|research and development funding|encryption|open[- ]source policy|compute policy|chips?|platform regulation|whatsapp|meity)\b/i;
const entertainmentPattern = /\b(celebrity gossip|bollywood|hollywood gossip|box office|movie review|film stars?|seinfeld|red carpet|reality tv)\b/i;
const creativeTechnologyPattern = /\b(ai|artificial intelligence|machine learning|computer graphics|vfx|animation|image generation|video generation|text[- ]to[- ]video|deepfakes?|rendering|camera technology)\b/i;
const sensationalHealthPattern = /\b(cancer cells? die in \d+ days?|permanent cure for (?:type \d )?diabetes|miracle cure|cured (?:more than )?\d[\d,]* people|doctors? (?:do not|don't|won't) (?:want you to )?know|one (?:drink|juice) cures?)\b/i;
const debunkingPattern = /\b(debunk|fact[- ]check|myth|misinformation|utter nonsense|not true|no (?:credible )?evidence)\b/i;
const socialCurrentAffairsPattern = /\b(brahminical supremacy|manuwaad|manusmriti|sexual crimes?|sexual assault|(?:kerala)?actorassault|actor assault|character assassination|social media trial killed|evms?|electronic voting machines?|trump administration|broadcasting services regulation bill|will china invade taiwan)\b/i;
const personalFinancePattern = /\b(stock markets?|mutual funds?|income tax|hra exemption|epfo|retirement funds?|real estate investment|property investment)\b/i;
const technicalFinanceContextPattern = /\b(ai|agents?|software|open[- ]source|workflow|developer|programming|api|algorithm|model|data science|blockchain|crypto|decentralized|dex|physics|research)\b/i;
const negativePattern = /\b(elections?|politicians?|parliament|congress party|bjp|narendra modi|rahul gandhi|cricket|ipl\b|football match|movie review|box office|bollywood|celebrity|recipe|restaurant|hotel|tourism|travel itinerary|flight deal|astrology|horoscope|stock market|mutual funds?|income tax|real estate|epfo|visa appointment|giveaway|discount code|shopping deal)\b/i;

function shouldExcludeOffTopic(text, strongest, combined, domainScore) {
  if (explicitContentPattern.test(text) || socialCurrentAffairsPattern.test(text)) return true;
  if (conflictNewsPattern.test(text) && !conflictTechnologyPattern.test(text)) return true;
  if (sensationalHealthPattern.test(text) && !debunkingPattern.test(text)) return true;
  const allowedTechnicalPolicy = partisanPoliticsPattern.test(text) && technicalPolicyPattern.test(text);
  const allowedCreativeTechnology = entertainmentPattern.test(text) && creativeTechnologyPattern.test(text);
  if (partisanPoliticsPattern.test(text) && !allowedTechnicalPolicy) return true;
  if (entertainmentPattern.test(text) && !allowedCreativeTechnology) return true;
  if (personalFinancePattern.test(text) && !technicalFinanceContextPattern.test(text)) return true;

  const negative = negativePattern.test(text);
  const substantialTechnicalSignal = strongest >= 4 || combined >= 7 || domainScore >= 4;
  return negative && !substantialTechnicalSignal && !allowedTechnicalPolicy && !allowedCreativeTechnology;
}

function sanitizeJsonLine(line) {
  return line.replaceAll("\u2028", " ").replaceAll("\u2029", " ");
}

function decodeEntities(value = "") {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function collectUrls(post) {
  const found = new Map();
  const add = (url, display = "") => {
    if (!url || !/^https?:\/\//i.test(url)) return;
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "t.co") return;
      if (publicEdition && parsed.protocol === "http:") parsed.protocol = "https:";
      const normalized = parsed.toString();
      found.set(normalized, display || parsed.hostname.replace(/^www\./, ""));
    } catch {}
  };

  const result = post?._data?.tweet_results?.result;
  const entityGroups = [
    result?.legacy?.entities,
    result?.note_tweet?.note_tweet_results?.result?.entity_set,
    post?.quoted_tweet?._data?.tweet_results?.result?.legacy?.entities,
  ];
  for (const entities of entityGroups) {
    for (const item of entities?.urls ?? []) {
      add(item.expanded_url || item.url, item.display_url);
    }
  }
  for (const text of [post.full_text, post.quoted_tweet?.full_text]) {
    for (const match of String(text ?? "").matchAll(/https?:\/\/[^\s<>]+/g)) {
      add(match[0].replace(/[),.;!?]+$/, ""));
    }
  }
  return [...found.entries()].slice(0, 5).map(([url, label]) => ({ url, label }));
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function scoreTopics(text) {
  return shelfDefinitions.map((shelf) => {
    const topics = shelf.topics
      .map(([name, patterns]) => {
        let score = 0;
        for (const [pattern, weight] of patterns) {
          if (pattern.test(text)) score += weight;
        }
        return { name, score };
      })
      .filter((topic) => topic.score > 0)
      .sort((a, b) => b.score - a.score);
    return {
      name: shelf.name,
      score: topics.slice(0, 3).reduce((sum, topic) => sum + topic.score, 0),
      strongest: topics[0]?.score ?? 0,
      topics,
    };
  }).sort((a, b) => b.score - a.score);
}

function inferFormats(post, text, urls, domains) {
  const formats = [];
  const add = (format) => {
    if (!formats.includes(format)) formats.push(format);
  };
  const isComment = post.is_reply || post.conversation_id !== post.tweet_id;
  const isThread = /\b(?:thread|megathread)\b|🧵|\b\d+\/\d+\b|\b1\/n\b/i.test(text);
  if (post.article) add("Article");
  if (isThread) add("Thread");
  if (isComment) add("Comment");
  if (post.quoted_tweet) add("Quote");
  if (domains.some((domain) => domain === "github.com" || domain === "gist.github.com")) add("Code");
  if (domains.some((domain) => domain === "arxiv.org" || domain === "nature.com" || domain === "science.org") || /\b(?:paper|preprint|study)\b/i.test(text)) add("Paper");
  if (/\b(?:tutorial|guide|how to|walkthrough|step[- ]by[- ]step|tips?|best practices?|cheat ?sheet)\b/i.test(text)) add("Guide");
  if (/\b(?:tool|library|framework|repo(?:sitory)?|open[- ]source|launch(?:ed|ing)?|built|introducing)\b/i.test(text) || formats.includes("Code")) add("Tool");
  if (/\b(?:course|book|reading list|resources?|collection|awesome list|reference)\b/i.test(text)) add("Reference");
  if (post.has_video || domains.some((domain) => domain === "youtube.com" || domain === "youtu.be")) add("Video");
  if (post.has_image) add("Image");
  if (!formats.length && urls.length) add("Link");
  if (!formats.length) add("Post");
  return formats.slice(0, 4);
}

function buildRecord(post) {
  if (publicEdition && post.lang !== "en") return null;

  const cleanForEdition = (value) => publicEdition ? redactPublicContactDetails(value) : value;
  const text = cleanForEdition(decodeEntities(post.full_text));
  const quoteText = cleanForEdition(decodeEntities(post.quoted_tweet?.full_text));
  const articleTitle = cleanForEdition(decodeEntities(post.article?.title));
  const articlePreview = cleanForEdition(decodeEntities(post.article?.preview_text || post.article?.full_text));
  const urls = collectUrls(post);
  const domains = [...new Set(urls.map((item) => domainOf(item.url)).filter(Boolean))];
  const classificationText = [text, quoteText, articleTitle, articlePreview, ...domains].join(" \n ");
  const scoringText = classificationText.replace(/https?:\/\/\S+/gi, " ");
  const shelfScores = scoreTopics(scoringText);
  let domainScore = 0;
  for (const domain of domains) {
    domainScore = Math.max(domainScore, technicalDomains.get(domain) ?? 0);
  }
  const strongest = shelfScores[0]?.strongest ?? 0;
  const combined = shelfScores[0]?.score ?? 0;
  const keep = strongest >= 3 || combined >= 5 || domainScore >= 4 || (domainScore >= 2 && strongest >= 2);
  if (!keep || findPublicSafetyViolation(classificationText) || shouldExcludeOffTopic(scoringText, strongest, combined, domainScore)) return null;

  let primaryShelf = shelfScores[0];
  if (!primaryShelf || primaryShelf.strongest === 0) {
    primaryShelf = shelfScores.find((shelf) => shelf.name === "Software Craft");
  }
  const selectedTopics = [];
  for (const shelf of shelfScores) {
    for (const topic of shelf.topics) {
      if (topic.score >= 3 && !selectedTopics.includes(topic.name)) selectedTopics.push(topic.name);
      if (selectedTopics.length >= 4) break;
    }
    if (selectedTopics.length >= 4) break;
  }
  if (!selectedTopics.length) selectedTopics.push("Developer Tools");

  if (publicEdition && selectedTopics.includes("Biology & Medicine")) {
    const hasTrustedHealthDomain = domains.some((domain) =>
      trustedHealthDomains.has(domain) || domain.endsWith(".edu") || domain.endsWith(".ac.uk"),
    );
    const hasResearchContext = healthEvidencePattern.test(scoringText);
    if (!hasTrustedHealthDomain && !hasResearchContext && !debunkingPattern.test(scoringText)) return null;
  }

  const formats = inferFormats(post, classificationText, urls, domains);
  const createdAt = new Date(Number(post.created_at) * 1000);
  const engagement = Number(post.favorite_count ?? 0) + Number(post.retweet_count ?? 0) * 2 + Number(post.bookmark_count ?? 0) * 3 + Number(post.reply_count ?? 0);
  const specificity = Math.min(10, Math.max(strongest, domainScore) + Math.min(3, selectedTopics.length - 1));
  const usefulComment = formats.includes("Comment") && (text.length >= 80 || formats.includes("Guide") || formats.includes("Code"));

  return {
    id: String(post.tweet_id),
    url: `https://x.com/${post.screen_name}/status/${post.tweet_id}`,
    author: decodeEntities(post.username || post.screen_name),
    handle: String(post.screen_name || ""),
    text,
    quoteText: quoteText || undefined,
    articleTitle: articleTitle || undefined,
    articlePreview: articlePreview || undefined,
    createdAt: createdAt.toISOString(),
    year: createdAt.getUTCFullYear(),
    shelf: primaryShelf.name,
    topics: selectedTopics,
    formats,
    domains,
    links: urls,
    language: post.lang || "unknown",
    media: [post.has_image && "Image", post.has_video && "Video", post.has_gif && "GIF"].filter(Boolean),
    stats: {
      likes: Number(post.favorite_count ?? 0),
      reposts: Number(post.retweet_count ?? 0),
      replies: Number(post.reply_count ?? 0),
      bookmarks: Number(post.bookmark_count ?? 0),
    },
    quality: specificity + Math.min(8, Math.log10(engagement + 1) * 2) + (formats.includes("Guide") ? 2 : 0) + (formats.includes("Paper") ? 1 : 0) + (usefulComment ? 2 : 0),
    flags: [usefulComment && "Useful comment", post.article && "Long-form"].filter(Boolean),
  };
}

const rawLines = fs.readFileSync(sourcePath, "utf8").split("\n");
const records = [];
let malformed = 0;
for (const line of rawLines) {
  if (!line.trim()) continue;
  try {
    const record = buildRecord(JSON.parse(sanitizeJsonLine(line)));
    if (record) records.push(record);
  } catch {
    malformed += 1;
  }
}

records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const countBy = (key) => Object.fromEntries(
  [...records.reduce((map, record) => {
    const values = Array.isArray(record[key]) ? record[key] : [record[key]];
    for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1]),
);

const payload = {
  meta: {
    publicEdition,
    sourceCount: rawLines.filter(Boolean).length,
    includedCount: records.length,
    excludedCount: rawLines.filter(Boolean).length - records.length,
    malformedCount: malformed,
    generatedAt: new Date().toISOString(),
    newestAt: records[0]?.createdAt,
    oldestAt: records.at(-1)?.createdAt,
    shelves: shelfDefinitions.map(({ name, description }) => ({ name, description })),
    counts: {
      shelves: countBy("shelf"),
      topics: countBy("topics"),
      formats: countBy("formats"),
      years: countBy("year"),
    },
  },
  records,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload));

console.log(JSON.stringify({
  source: payload.meta.sourceCount,
  included: payload.meta.includedCount,
  excluded: payload.meta.excludedCount,
  malformed,
  shelves: payload.meta.counts.shelves,
  topTopics: Object.entries(payload.meta.counts.topics).slice(0, 30),
  formats: payload.meta.counts.formats,
  outputMB: (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2),
}, null, 2));
