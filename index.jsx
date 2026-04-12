import { useState } from "react";

// ============================================================
// DATA: Du Fu's life timeline, locations, events, and quizzes
// ============================================================
const CHARACTERS = [
  {
    id: "dufu",
    name: "\u675C\u752B",
    title: "\u8BD7\u5723",
    years: "712\u2014770",
    dynasty: "\u5510",
    description: "\u5510\u4EE3\u6700\u4F1F\u5927\u7684\u73B0\u5B9E\u4E3B\u4E49\u8BD7\u4EBA\uFF0C\u4E0E\u674E\u767D\u5E76\u79F0\u300C\u674E\u675C\u300D",
    avatar: "\u{1F58A}\uFE0F",
    color: "#4A90A4",
  },
  {
    id: "libai",
    name: "\u674E\u767D",
    title: "\u8BD7\u4ED9",
    years: "701\u2014762",
    dynasty: "\u5510",
    description: "\u5373\u5C06\u63A8\u51FA...",
    avatar: "\u{1F377}",
    color: "#C0392B",
    locked: true,
  },
  {
    id: "sushi",
    name: "\u82CF\u8F7C",
    title: "\u4E1C\u5761\u5C45\u58EB",
    years: "1037\u20141101",
    dynasty: "\u5B8B",
    description: "\u5373\u5C06\u63A8\u51FA...",
    avatar: "\u{1F4DC}",
    color: "#8E44AD",
    locked: true,
  },
];

const LOCATIONS = {
  luoyang: { name: "\u6D1B\u9633", x: 58, y: 48, desc: "\u675C\u752B\u51FA\u751F\u5730\uFF0C\u4E1C\u90FD" },
  changan: { name: "\u957F\u5B89", x: 50, y: 50, desc: "\u5510\u671D\u90FD\u57CE" },
  qilu: { name: "\u9F50\u9C81", x: 68, y: 42, desc: "\u5C71\u4E1C\u4E00\u5E26" },
  yanzhou: { name: "\u5156\u5DDE", x: 66, y: 44, desc: "\u675C\u752B\u7236\u4EB2\u4EFB\u804C\u4E4B\u5730" },
  fengxiang: { name: "\u51E4\u7FD4", x: 46, y: 50, desc: "\u5510\u8083\u5B97\u884C\u5728" },
  chengdu: { name: "\u6210\u90FD", x: 42, y: 62, desc: "\u5929\u5E9C\u4E4B\u56FD" },
  kuizhou: { name: "\u5914\u5DDE", x: 50, y: 60, desc: "\u4ECA\u91CD\u5E86\u5949\u8282" },
  tanzhou: { name: "\u6F6D\u5DDE", x: 58, y: 65, desc: "\u4ECA\u6E56\u5357\u957F\u6C99" },
  leiyang: { name: "\u8012\u9633", x: 58, y: 70, desc: "\u675C\u752B\u7EC8\u7109\u4E4B\u5730" },
};

const TIMELINE = [
  {
    id: "youth",
    period: "\u5C11\u5E74\u6E38\u5386",
    year: "712\u2014735",
    yearStart: 712,
    yearEnd: 735,
    location: "luoyang",
    color: "#27AE60",
    summary: "\u675C\u752B\u51FA\u751F\u4E8E\u6CB3\u5357\u5DE9\u53BF\uFF0C\u5C11\u5E74\u65F6\u4EE3\u5728\u6D1B\u9633\u3001\u9F50\u9C81\u4E00\u5E26\u6E38\u5386\u3002\u4ED6\u5929\u8D44\u806A\u9896\uFF0C\u4E03\u5C81\u80FD\u8BD7\uFF0C\u8BFB\u4E66\u7834\u4E07\u5377\uFF0C\u904D\u89C8\u7FA4\u4E66\u3002",
    event: {
      title: "\u5C11\u5E74\u58EE\u6E38",
      narrative: "\u516C\u5143712\u5E74\uFF0C\u675C\u752B\u51FA\u751F\u4E8E\u6CB3\u5357\u5DE9\u53BF\u4E00\u4E2A\u4E66\u9999\u95E8\u7B2C\u3002\u7956\u7236\u675C\u5BA1\u8A00\u662F\u521D\u5510\u8457\u540D\u8BD7\u4EBA\u3002\u5C11\u5E74\u675C\u752B\u610F\u6C14\u98CE\u53D1\uFF0C20\u5C81\u5F00\u59CB\u6F2B\u6E38\u5434\u8D8A\u9F50\u9C81\uFF0C\u767B\u4E34\u6CF0\u5C71\uFF0C\u5199\u4E0B\u5343\u53E4\u540D\u7BC7\u3002",
      poem: {
        title: "\u671B\u5CB3",
        content: "\u5CB1\u5B97\u592B\u5982\u4F55\uFF1F\u9F50\u9C81\u9752\u672A\u4E86\u3002\n\u9020\u5316\u949F\u795E\u79C0\uFF0C\u9634\u9633\u5272\u660F\u6653\u3002\n\u8361\u80F8\u751F\u66FE\u4E91\uFF0C\u51B3\u7726\u5165\u5F52\u9E1F\u3002\n\u4F1A\u5F53\u51CC\u7EDD\u9876\uFF0C\u4E00\u89C8\u4F17\u5C71\u5C0F\u3002",
      },
    },
    quiz: [
      {
        type: "choice",
        question: "\u675C\u752B\u7684\u7956\u7236\u662F\u8C01\uFF1F",
        options: ["\u675C\u5BA1\u8A00", "\u675C\u7267", "\u675C\u8340\u9E64", "\u675C\u9884"],
        answer: 0,
        explanation: "\u675C\u5BA1\u8A00\u662F\u521D\u5510\u300C\u6587\u7AE0\u56DB\u53CB\u300D\u4E4B\u4E00\uFF0C\u675C\u752B\u7684\u8BD7\u624D\u6709\u5BB6\u5B66\u6E0A\u6E90\u3002",
      },
      {
        type: "choice",
        question: "\u300C\u4F1A\u5F53\u51CC\u7EDD\u9876\uFF0C\u4E00\u89C8\u4F17\u5C71\u5C0F\u300D\u63CF\u5199\u7684\u662F\u54EA\u5EA7\u5C71\uFF1F",
        options: ["\u534E\u5C71", "\u6CF0\u5C71", "\u5D69\u5C71", "\u8861\u5C71"],
        answer: 1,
        explanation: "\u300A\u671B\u5CB3\u300B\u5199\u7684\u662F\u4E1C\u5CB3\u6CF0\u5C71\uFF0C\u300C\u5CB1\u5B97\u300D\u5373\u6CF0\u5C71\u7684\u522B\u79F0\u3002",
      },
      {
        type: "poem_fill",
        question: "\u8BF7\u8865\u5168\u300A\u671B\u5CB3\u300B\u7684\u540D\u53E5\uFF1A\n\u300C\u9020\u5316\u949F\u795E\u79C0\uFF0C____\u5272\u660F\u6653\u300D",
        answer: "\u9634\u9633",
        explanation: "\u9634\u9633\u5272\u660F\u6653\u2014\u2014\u5C71\u7684\u5357\u5317\u4E24\u9762\uFF0C\u4E00\u9762\u660E\u4EAE\u4E00\u9762\u660F\u6697\uFF0C\u5F62\u5BB9\u6CF0\u5C71\u4E4B\u9AD8\u5927\u3002",
      },
    ],
  },
  {
    id: "changan_seeking",
    period: "\u56F0\u5B88\u957F\u5B89",
    year: "735\u2014755",
    yearStart: 735,
    yearEnd: 755,
    location: "changan",
    color: "#F39C12",
    summary: "\u675C\u752B\u8D74\u957F\u5B89\u53C2\u52A0\u79D1\u4E3E\u843D\u7B2C\uFF0C\u6B64\u540E\u5728\u957F\u5B89\u56F0\u5B88\u5341\u5E74\uFF0C\u8FC7\u7740\u300C\u671D\u6263\u5BCC\u513F\u95E8\uFF0C\u66AE\u968F\u80A5\u9A6C\u5C18\u300D\u7684\u8270\u8F9B\u751F\u6D3B\u3002",
    event: {
      title: "\u957F\u5B89\u5341\u5E74",
      narrative: "\u516C\u5143735\u5E74\uFF0C24\u5C81\u7684\u675C\u752B\u6EE1\u6000\u58EE\u5FD7\u8D74\u957F\u5B89\u53C2\u52A0\u79D1\u4E3E\uFF0C\u5374\u906D\u9047\u6743\u76F8\u674E\u6797\u752B\u64CD\u7EB5\u7684\u300C\u91CE\u65E0\u9057\u8D24\u300D\u95F9\u5267\uFF0C\u540D\u843D\u5B59\u5C71\u3002\u6B64\u540E\u4ED6\u56F0\u5C45\u957F\u5B89\uFF0C\u6C42\u5B98\u65E0\u95E8\uFF0C\u76EE\u7779\u4E86\u76DB\u5510\u7E41\u534E\u80CC\u540E\u7684\u793E\u4F1A\u5371\u673A\u3002\u5728\u8FD9\u6BB5\u8270\u96BE\u5C81\u6708\u4E2D\uFF0C\u4ED6\u4E0E\u674E\u767D\u76F8\u9047\uFF0C\u7ED3\u4E3A\u81F3\u4EA4\u3002",
      poem: {
        title: "\u5949\u8D60\u97E6\u5DE6\u4E1E\u4E08\u4E8C\u5341\u4E8C\u97F5\uFF08\u8282\u9009\uFF09",
        content: "\u7EE8\u7EE4\u4E0D\u997F\u6B7B\uFF0C\u5112\u51A0\u591A\u8BEF\u8EAB\u3002\n\u4E08\u4EBA\u8BD5\u9759\u542C\uFF0C\u8D31\u5B50\u8BF7\u5177\u9648\u3002\n\u752B\u6614\u5C11\u5E74\u65E5\uFF0C\u65E9\u5145\u89C2\u56FD\u5BBE\u3002\n\u8BFB\u4E66\u7834\u4E07\u5377\uFF0C\u4E0B\u7B14\u5982\u6709\u795E\u3002",
      },
    },
    quiz: [
      {
        type: "choice",
        question: "\u675C\u752B\u79D1\u4E3E\u843D\u7B2C\u7684\u4E3B\u8981\u539F\u56E0\u662F\u4EC0\u4E48\uFF1F",
        options: [
          "\u624D\u5B66\u4E0D\u8DB3",
          "\u674E\u6797\u752B\u64CD\u7EB5\u79D1\u4E3E\uFF0C\u79F0\u300C\u91CE\u65E0\u9057\u8D24\u300D",
          "\u6CA1\u6709\u53C2\u52A0\u8003\u8BD5",
          "\u56E0\u75C5\u7F3A\u8003",
        ],
        answer: 1,
        explanation: "\u5929\u5B9D\u516D\u5E74\uFF08747\u5E74\uFF09\uFF0C\u6743\u76F8\u674E\u6797\u752B\u4E3A\u9632\u6B62\u4EBA\u624D\u51FA\u5934\u5A01\u80C1\u81EA\u5DF1\uFF0C\u64CD\u7EB5\u79D1\u4E3E\uFF0C\u7ADF\u5411\u7384\u5B97\u4E0A\u4E66\u79F0\u300C\u91CE\u65E0\u9057\u8D24\u300D\uFF0C\u65E0\u4E00\u4EBA\u5F55\u53D6\u3002",
      },
      {
        type: "choice",
        question: "\u675C\u752B\u5728\u957F\u5B89\u65F6\u671F\u4E0E\u54EA\u4F4D\u5927\u8BD7\u4EBA\u6210\u4E3A\u597D\u53CB\uFF1F",
        options: ["\u767D\u5C45\u6613", "\u738B\u7EF4", "\u674E\u767D", "\u5B5F\u6D69\u7136"],
        answer: 2,
        explanation: "\u675C\u752B\u4E0E\u674E\u767D\u4E8E\u5929\u5B9D\u4E09\u5E74\uFF08744\u5E74\uFF09\u5728\u6D1B\u9633\u76F8\u9047\uFF0C\u6B64\u540E\u540C\u6E38\u6881\u5B8B\uFF0C\u5EFA\u7ACB\u4E86\u6DF1\u539A\u53CB\u8C0A\u3002\u675C\u752B\u5199\u4E86\u5927\u91CF\u6000\u5FF5\u674E\u767D\u7684\u8BD7\u3002",
      },
      {
        type: "poem_fill",
        question: "\u8BF7\u8865\u5168\u675C\u752B\u7684\u540D\u53E5\uFF1A\n\u300C\u8BFB\u4E66\u7834\u4E07\u5377\uFF0C____\u5982\u6709\u795E\u300D",
        answer: "\u4E0B\u7B14",
        explanation: "\u8BFB\u4E66\u7834\u4E07\u5377\uFF0C\u4E0B\u7B14\u5982\u6709\u795E\u2014\u2014\u5F62\u5BB9\u8BFB\u4E66\u5E7F\u535A\uFF0C\u5199\u4F5C\u81EA\u7136\u6587\u601D\u6CC9\u6D8C\u3002",
      },
    ],
  },
  {
    id: "anshi_rebellion",
    period: "\u5B89\u53F2\u4E4B\u4E71",
    year: "755\u2014759",
    yearStart: 755,
    yearEnd: 759,
    location: "fengxiang",
    color: "#E74C3C",
    summary: "\u5B89\u7984\u5C71\u8D77\u5175\u53DB\u4E71\uFF0C\u5929\u4E0B\u5927\u4E71\u3002\u675C\u752B\u5192\u6B7B\u5954\u8D74\u51E4\u7FD4\u6295\u5954\u5510\u8083\u5B97\uFF0C\u88AB\u6388\u5DE6\u62FE\u9057\uFF0C\u540E\u56E0\u76F4\u8A00\u8FDB\u8C0F\u88AB\u8D2C\u3002",
    event: {
      title: "\u56FD\u7834\u5C71\u6CB3\u5728",
      narrative: "\u516C\u5143755\u5E74\uFF0C\u5B89\u7984\u5C71\u5728\u8303\u9633\u8D77\u5175\u53DB\u5510\u3002\u957F\u5B89\u5931\u9677\uFF0C\u7384\u5B97\u897F\u9003\u3002\u675C\u752B\u4E00\u5BB6\u6D41\u79BB\u5931\u6240\uFF0C\u4ED6\u628A\u5BB6\u4EBA\u5B89\u987F\u5728\u9104\u5DDE\uFF0C\u53EA\u8EAB\u5192\u9669\u7A7F\u8D8A\u53DB\u519B\u5C01\u9501\u7EBF\uFF0C\u5954\u8D74\u51E4\u7FD4\u6295\u5954\u8083\u5B97\u3002\u8083\u5B97\u611F\u5176\u5FE0\u8BDA\uFF0C\u6388\u4ED6\u5DE6\u62FE\u9057\u4E4B\u804C\u3002\u7136\u800C\u675C\u752B\u56E0\u4E3A\u5BB0\u76F8\u623F\u7426\u8FA9\u62A4\uFF0C\u89E6\u6012\u8083\u5B97\uFF0C\u88AB\u8D2C\u534E\u5DDE\u3002",
      poem: {
        title: "\u6625\u671B",
        content: "\u56FD\u7834\u5C71\u6CB3\u5728\uFF0C\u57CE\u6625\u8349\u6728\u6DF1\u3002\n\u611F\u65F6\u82B1\u6E85\u6CEA\uFF0C\u6068\u522B\u9E1F\u60CA\u5FC3\u3002\n\u70FD\u706B\u8FDE\u4E09\u6708\uFF0C\u5BB6\u4E66\u62B5\u4E07\u91D1\u3002\n\u767D\u5934\u6414\u66F4\u77ED\uFF0C\u6D51\u6B32\u4E0D\u80DC\u7C2A\u3002",
      },
    },
    quiz: [
      {
        type: "choice",
        question: "\u5B89\u53F2\u4E4B\u4E71\u662F\u7531\u8C01\u53D1\u52A8\u7684\uFF1F",
        options: ["\u5B89\u7984\u5C71\u548C\u53F2\u601D\u660E", "\u9EC4\u5DE2", "\u674E\u6797\u752B", "\u6768\u56FD\u5FE0"],
        answer: 0,
        explanation: "\u5B89\u53F2\u4E4B\u4E71\u56E0\u5B89\u7984\u5C71\u548C\u53F2\u601D\u660E\u5148\u540E\u53D1\u52A8\u800C\u5F97\u540D\uFF0C\u662F\u5510\u671D\u7531\u76DB\u8F6C\u8870\u7684\u8F6C\u6298\u70B9\u3002",
      },
      {
        type: "choice",
        question: "\u675C\u752B\u5728\u5B89\u53F2\u4E4B\u4E71\u4E2D\u88AB\u6388\u4E88\u7684\u5B98\u804C\u662F\uFF1F",
        options: ["\u7FF0\u6797\u5B66\u58EB", "\u5DE6\u62FE\u9057", "\u8282\u5EA6\u4F7F", "\u523A\u53F2"],
        answer: 1,
        explanation: "\u5DE6\u62FE\u9057\u662F\u8C0F\u5B98\uFF0C\u8D1F\u8D23\u5411\u7687\u5E1D\u8FDB\u8A00\u7EA0\u9519\u3002\u675C\u752B\u56E0\u6B64\u88AB\u79F0\u4E3A\u300C\u675C\u62FE\u9057\u300D\u3002",
      },
      {
        type: "poem_fill",
        question: "\u8BF7\u8865\u5168\u300A\u6625\u671B\u300B\u540D\u53E5\uFF1A\n\u300C\u70FD\u706B\u8FDE\u4E09\u6708\uFF0C____\u62B5\u4E07\u91D1\u300D",
        answer: "\u5BB6\u4E66",
        explanation: "\u6218\u706B\u8FDE\u7EF5\uFF0C\u4E00\u5C01\u5BB6\u4E66\u6BD4\u4E07\u4E24\u9EC4\u91D1\u8FD8\u73CD\u8D35\uFF0C\u9053\u51FA\u4E86\u6218\u4E71\u4E2D\u5BF9\u4EB2\u4EBA\u7684\u601D\u5FF5\u3002",
      },
      {
        type: "order",
        question: "\u8BF7\u5C06\u5B89\u53F2\u4E4B\u4E71\u671F\u95F4\u7684\u4E8B\u4EF6\u6309\u65F6\u95F4\u6392\u5E8F",
        items: [
          "\u5B89\u7984\u5C71\u8303\u9633\u8D77\u5175",
          "\u957F\u5B89\u5931\u9677",
          "\u675C\u752B\u5954\u8D74\u51E4\u7FD4",
          "\u675C\u752B\u88AB\u6388\u5DE6\u62FE\u9057",
        ],
        answer: [0, 1, 2, 3],
        explanation: "755\u5E74\u5B89\u7984\u5C71\u8D77\u5175 \u2192 756\u5E74\u957F\u5B89\u5931\u9677 \u2192 \u675C\u752B\u5192\u9669\u5954\u8D74\u51E4\u7FD4 \u2192 \u8083\u5B97\u6388\u5176\u5DE6\u62FE\u9057\u3002",
      },
    ],
  },
  {
    id: "chengdu_thatched",
    period: "\u6210\u90FD\u8349\u5802",
    year: "759\u2014765",
    yearStart: 759,
    yearEnd: 765,
    location: "chengdu",
    color: "#2ECC71",
    summary: "\u675C\u752B\u8F9E\u5B98\u5165\u8700\uFF0C\u5728\u6210\u90FD\u6D63\u82B1\u6EAA\u7554\u7B51\u8349\u5802\u3002\u5728\u597D\u53CB\u4E25\u6B66\u7684\u5E2E\u52A9\u4E0B\uFF0C\u5EA6\u8FC7\u4E86\u4E00\u6BB5\u76F8\u5BF9\u5B89\u5B9A\u7684\u65F6\u5149\u3002",
    event: {
      title: "\u6D63\u82B1\u6EAA\u7554",
      narrative: "\u516C\u5143759\u5E74\uFF0C\u675C\u752B\u8F97\u8F6C\u6765\u5230\u6210\u90FD\uFF0C\u5728\u6D63\u82B1\u6EAA\u7554\u5EFA\u8D77\u4E86\u4E00\u5EA7\u8349\u5802\u3002\u597D\u53CB\u3001\u5251\u5357\u8282\u5EA6\u4F7F\u4E25\u6B66\u591A\u6B21\u63A5\u6D4E\u4ED6\u3002\u8FD9\u662F\u675C\u752B\u4E00\u751F\u4E2D\u6700\u5B89\u5B9A\u7684\u65F6\u671F\uFF0C\u4ED6\u5728\u6B64\u521B\u4F5C\u4E86\u5927\u91CF\u8BD7\u7BC7\u3002\u4F46\u79CB\u98CE\u66B4\u96E8\u4E2D\u8349\u5802\u88AB\u6BC1\uFF0C\u4ED6\u5199\u4E0B\u4E86\u5FE7\u56FD\u5FE7\u6C11\u7684\u5343\u53E4\u540D\u7BC7\u3002",
      poem: {
        title: "\u8305\u5C4B\u4E3A\u79CB\u98CE\u6240\u7834\u6B4C\uFF08\u8282\u9009\uFF09",
        content: "\u516B\u6708\u79CB\u9AD8\u98CE\u6012\u53F7\uFF0C\u5377\u6211\u5C4B\u4E0A\u4E09\u91CD\u8305\u3002\n\u8305\u98DE\u6E21\u6C5F\u6D12\u6C5F\u90CA\uFF0C\u9AD8\u8005\u6302\u7F6A\u957F\u6797\u68A2\u3002\n\u2026\u2026\n\u5B89\u5F97\u5E7F\u53A6\u5343\u4E07\u95F4\uFF0C\u5927\u5E87\u5929\u4E0B\u5BD2\u58EB\u4FF1\u6B22\u989C\uFF01\n\u98CE\u96E8\u4E0D\u52A8\u5B89\u5982\u5C71\u3002\n\u545C\u547C\uFF01\u4F55\u65F6\u773C\u524D\u7A81\u5140\u89C1\u6B64\u5C4B\uFF0C\n\u543E\u5E90\u72EC\u7834\u53D7\u51BB\u6B7B\u4EA6\u8DB3\uFF01",
      },
    },
    quiz: [
      {
        type: "choice",
        question: "\u675C\u752B\u7684\u8349\u5802\u5EFA\u5728\u6210\u90FD\u54EA\u6761\u6EAA\u6D41\u65C1\u8FB9\uFF1F",
        options: ["\u9526\u6C5F", "\u6D63\u82B1\u6EAA", "\u5E9C\u5357\u6CB3", "\u6CB1\u6C5F"],
        answer: 1,
        explanation: "\u675C\u752B\u8349\u5802\u4F4D\u4E8E\u6210\u90FD\u6D63\u82B1\u6EAA\u7554\uFF0C\u5982\u4ECA\u662F\u8457\u540D\u7684\u675C\u752B\u8349\u5802\u535A\u7269\u9986\u3002",
      },
      {
        type: "choice",
        question: "\u300C\u5B89\u5F97\u5E7F\u53A6\u5343\u4E07\u95F4\u300D\u8868\u8FBE\u4E86\u675C\u752B\u600E\u6837\u7684\u60C5\u6000\uFF1F",
        options: [
          "\u60F3\u8981\u6210\u4E3A\u5BCC\u7FC1",
          "\u5FE7\u56FD\u5FE7\u6C11\uFF0C\u5E0C\u671B\u5929\u4E0B\u5BD2\u58EB\u90FD\u6709\u5C4B\u4F4F",
          "\u60F3\u8981\u5EFA\u9020\u5BAB\u6BBF",
          "\u5BF9\u5EFA\u7B51\u7684\u70ED\u7231",
        ],
        answer: 1,
        explanation: "\u675C\u752B\u81EA\u5DF1\u7684\u8305\u5C4B\u88AB\u79CB\u98CE\u5439\u7834\uFF0C\u5374\u60F3\u5230\u5929\u4E0B\u8D2B\u5BD2\u4E4B\u4EBA\uFF0C\u5B81\u613F\u81EA\u5DF1\u53D7\u51BB\u4E5F\u8981\u8BA9\u4ED6\u4EEC\u6709\u623F\u4F4F\uFF0C\u4F53\u73B0\u4E86\u4F1F\u5927\u7684\u4EC1\u7231\u80F8\u6000\u3002",
      },
      {
        type: "poem_fill",
        question: "\u8BF7\u8865\u5168\u540D\u53E5\uFF1A\n\u300C\u5B89\u5F97\u5E7F\u53A6\u5343\u4E07\u95F4\uFF0C\u5927\u5E87\u5929\u4E0B\u5BD2\u58EB\u4FF1____\uFF01\u300D",
        answer: "\u6B22\u989C",
        explanation: "\u5927\u5E87\u5929\u4E0B\u5BD2\u58EB\u4FF1\u6B22\u989C\u2014\u2014\u8BA9\u5929\u4E0B\u7A77\u4EBA\u90FD\u80FD\u5F00\u5FC3\u5730\u7B11\u3002",
      },
    ],
  },
  {
    id: "kuizhou_years",
    period: "\u5914\u5DDE\u5C81\u6708",
    year: "765\u2014768",
    yearStart: 765,
    yearEnd: 768,
    location: "kuizhou",
    color: "#9B59B6",
    summary: "\u4E25\u6B66\u53BB\u4E16\u540E\uFF0C\u675C\u752B\u79BB\u5F00\u6210\u90FD\uFF0C\u6CBF\u957F\u6C5F\u4E1C\u4E0B\uFF0C\u5728\u5914\u5DDE\u505C\u7559\u8FD1\u4E24\u5E74\u3002\u8FD9\u662F\u4ED6\u8BD7\u6B4C\u521B\u4F5C\u7684\u5DC5\u5CF0\u65F6\u671F\u3002",
    event: {
      title: "\u8BD7\u6B4C\u5DC5\u5CF0",
      narrative: "765\u5E74\u4E25\u6B66\u53BB\u4E16\uFF0C\u675C\u752B\u5931\u53BB\u4F9D\u9760\uFF0C\u53EA\u597D\u4E58\u8239\u6CBF\u957F\u6C5F\u4E1C\u4E0B\u3002\u5728\u5914\u5DDE\uFF08\u4ECA\u5949\u8282\uFF09\uFF0C\u4ED6\u505C\u7559\u4E86\u8FD1\u4E24\u5E74\u3002\u867D\u8EAB\u4F53\u65E5\u8870\uFF0C\u4F46\u521B\u4F5C\u529B\u60CA\u4EBA\u2014\u2014\u5728\u5914\u5DDE\u5199\u4E0B\u4E86430\u591A\u9996\u8BD7\uFF0C\u5360\u5176\u5168\u90E8\u8BD7\u4F5C\u7684\u4E09\u5206\u4E4B\u4E00\uFF0C\u5305\u62EC\u8457\u540D\u7684\u300A\u79CB\u5174\u516B\u9996\u300B\u300A\u767B\u9AD8\u300B\u7B49\u5DC5\u5CF0\u4E4B\u4F5C\u3002",
      poem: {
        title: "\u767B\u9AD8",
        content: "\u98CE\u6025\u5929\u9AD8\u7336\u5578\u54C0\uFF0C\u6E1A\u6E05\u6C99\u767D\u9E1F\u98DE\u56DE\u3002\n\u65E0\u8FB9\u843D\u6728\u8427\u8427\u4E0B\uFF0C\u4E0D\u5C3D\u957F\u6C5F\u6EDA\u6EDA\u6765\u3002\n\u4E07\u91CC\u60B2\u79CB\u5E38\u4F5C\u5BA2\uFF0C\u767E\u5E74\u591A\u75C5\u72EC\u767B\u53F0\u3002\n\u8270\u96BE\u82E6\u6068\u7E41\u971C\u9B13\uFF0C\u6F66\u5012\u65B0\u505C\u6D4A\u9152\u676F\u3002",
      },
    },
    quiz: [
      {
        type: "choice",
        question: "\u675C\u752B\u5728\u5914\u5DDE\u671F\u95F4\u5927\u7EA6\u521B\u4F5C\u4E86\u591A\u5C11\u9996\u8BD7\uFF1F",
        options: ["\u7EA6100\u9996", "\u7EA6200\u9996", "\u7EA6430\u9996", "\u7EA650\u9996"],
        answer: 2,
        explanation: "\u675C\u752B\u5728\u5914\u5DDE\u4E0D\u5230\u4E24\u5E74\u95F4\u521B\u4F5C\u4E86\u7EA6430\u9996\u8BD7\uFF0C\u5360\u5176\u4F20\u4E16\u8BD7\u4F5C\u7684\u8FD1\u4E09\u5206\u4E4B\u4E00\uFF0C\u662F\u5176\u521B\u4F5C\u6700\u65FA\u76DB\u7684\u65F6\u671F\u3002",
      },
      {
        type: "choice",
        question: "\u300A\u767B\u9AD8\u300B\u88AB\u540E\u4EBA\u8A89\u4E3A\u4EC0\u4E48\uFF1F",
        options: ["\u4E03\u5F8B\u4E4B\u51A0", "\u4E94\u7EDD\u4E4B\u9996", "\u8BCD\u4E2D\u4E4B\u9F99", "\u6587\u7AE0\u4E4B\u7956"],
        answer: 0,
        explanation: "\u300A\u767B\u9AD8\u300B\u88AB\u660E\u4EE3\u80E1\u5E94\u9E9F\u8A89\u4E3A\u300C\u53E4\u4ECA\u4E03\u8A00\u5F8B\u7B2C\u4E00\u300D\uFF0C\u5168\u8BD7\u516B\u53E5\u7686\u5BF9\uFF0C\u6C14\u8C61\u4E07\u5343\u3002",
      },
      {
        type: "poem_fill",
        question: "\u8BF7\u8865\u5168\u300A\u767B\u9AD8\u300B\u540D\u53E5\uFF1A\n\u300C\u65E0\u8FB9\u843D\u6728\u8427\u8427\u4E0B\uFF0C\u4E0D\u5C3D\u957F\u6C5F____\u6765\u300D",
        answer: "\u6EDA\u6EDA",
        explanation: "\u65E0\u8FB9\u843D\u6728\u8427\u8427\u4E0B\uFF0C\u4E0D\u5C3D\u957F\u6C5F\u6EDA\u6EDA\u6765\u2014\u2014\u843D\u53F6\u65E0\u8FB9\u7EB7\u98DE\uFF0C\u957F\u6C5F\u6EDA\u6EDA\u4E1C\u6D41\uFF0C\u58EE\u9614\u800C\u60B2\u51C9\u3002",
      },
    ],
  },
  {
    id: "final_journey",
    period: "\u6F02\u6CCA\u7EC8\u8001",
    year: "768\u2014770",
    yearStart: 768,
    yearEnd: 770,
    location: "tanzhou",
    color: "#7F8C8D",
    summary: "\u675C\u752B\u7EE7\u7EED\u6CBF\u6C5F\u6F02\u6CCA\uFF0C\u7ECF\u5CB3\u9633\u3001\u6F6D\u5DDE\uFF0C\u6700\u7EC8\u5728\u7531\u6F6D\u5DDE\u5F80\u5CB3\u9633\u7684\u4E00\u6761\u5C0F\u8239\u4E0A\u75C5\u901D\uFF0C\u4EAB\u5E7459\u5C81\u3002",
    event: {
      title: "\u661F\u9668\u6E58\u6C5F",
      narrative: "768\u5E74\uFF0C\u675C\u752B\u79BB\u5F00\u5914\u5DDE\u7EE7\u7EED\u4E1C\u884C\uFF0C\u7ECF\u8FC7\u5CB3\u9633\u697C\u65F6\u5199\u4E0B\u4E86\u58EE\u9614\u7684\u300A\u767B\u5CB3\u9633\u697C\u300B\u3002\u6B64\u540E\u4ED6\u5728\u6F6D\u5DDE\uFF08\u957F\u6C99\uFF09\u4E00\u5E26\u6F02\u6CCA\u3002770\u5E74\u51AC\uFF0C\u5E74\u8FC8\u591A\u75C5\u7684\u675C\u752B\u5728\u7531\u6F6D\u5DDE\u524D\u5F80\u5CB3\u9633\u7684\u5C0F\u8239\u4E0A\u6EA1\u7136\u957F\u901D\uFF0C\u7EC8\u5E7459\u5C81\u3002\u4E00\u4EE3\u8BD7\u5723\uFF0C\u5C31\u6B64\u9668\u843D\u5728\u6E58\u6C5F\u4E4B\u4E0A\u3002",
      poem: {
        title: "\u767B\u5CB3\u9633\u697C",
        content: "\u6614\u95FB\u6D1E\u5EAD\u6C34\uFF0C\u4ECA\u4E0A\u5CB3\u9633\u697C\u3002\n\u5434\u695A\u4E1C\u5357\u577C\uFF0C\u4E7E\u5764\u65E5\u591C\u6D6E\u3002\n\u4EB2\u670B\u65E0\u4E00\u5B57\uFF0C\u8001\u75C5\u6709\u5B64\u821F\u3002\n\u620E\u9A6C\u5173\u5C71\u5317\uFF0C\u51ED\u8F69\u6D95\u6CD7\u6D41\u3002",
      },
    },
    quiz: [
      {
        type: "choice",
        question: "\u675C\u752B\u53BB\u4E16\u65F6\u7684\u5E74\u9F84\u662F\uFF1F",
        options: ["49\u5C81", "59\u5C81", "69\u5C81", "39\u5C81"],
        answer: 1,
        explanation: "\u675C\u752B\u751F\u4E8E712\u5E74\uFF0C\u5352\u4E8E770\u5E74\uFF0C\u4EAB\u5E7459\u5C81\u3002",
      },
      {
        type: "choice",
        question: "\u675C\u752B\u88AB\u540E\u4E16\u5C0A\u79F0\u4E3A\u4EC0\u4E48\uFF1F",
        options: ["\u8BD7\u4ED9", "\u8BD7\u5723", "\u8BD7\u4F5B", "\u8BD7\u9B3C"],
        answer: 1,
        explanation: "\u675C\u752B\u56E0\u5FE7\u56FD\u5FE7\u6C11\u7684\u60C5\u6000\u548C\u7CBE\u6E5B\u7684\u8BD7\u827A\u88AB\u5C0A\u4E3A\u300C\u8BD7\u5723\u300D\uFF0C\u5176\u8BD7\u88AB\u79F0\u4E3A\u300C\u8BD7\u53F2\u300D\u3002",
      },
      {
        type: "poem_fill",
        question: "\u8BF7\u8865\u5168\u300A\u767B\u5CB3\u9633\u697C\u300B\u540D\u53E5\uFF1A\n\u300C\u5434\u695A\u4E1C\u5357\u577C\uFF0C____\u65E5\u591C\u6D6E\u300D",
        answer: "\u4E7E\u5764",
        explanation: "\u5434\u695A\u4E1C\u5357\u577C\uFF0C\u4E7E\u5764\u65E5\u591C\u6D6E\u2014\u2014\u6D1E\u5EAD\u6E56\u4E4B\u5E7F\u9614\uFF0C\u4EFF\u4F5B\u5C06\u5434\u695A\u5927\u5730\u5288\u5F00\uFF0C\u5929\u5730\u90FD\u5728\u6E56\u4E2D\u65E5\u591C\u6D6E\u6C89\u3002",
      },
    ],
  },
];

// ============================================================
// COMPONENTS
// ============================================================

function CharacterSelect({ onSelect }) {
  return (
    <div style={styles.selectScreen}>
      <h1 style={styles.mainTitle}>{"\u5386 \u53F2 \u957F \u6CB3"}</h1>
      <p style={styles.subtitle}>{"\u9009\u62E9\u4E00\u4F4D\u5386\u53F2\u4EBA\u7269\uFF0C\u8E0F\u4E0A\u65F6\u7A7A\u4E4B\u65C5"}</p>
      <div style={styles.characterGrid}>
        {CHARACTERS.map((char) => (
          <div
            key={char.id}
            style={{
              ...styles.characterCard,
              borderColor: char.color,
              opacity: char.locked ? 0.5 : 1,
              cursor: char.locked ? "not-allowed" : "pointer",
            }}
            onClick={() => !char.locked && onSelect(char)}
          >
            <div style={{ ...styles.charAvatar, backgroundColor: char.color }}>
              <span style={{ fontSize: 40 }}>{char.avatar}</span>
            </div>
            <h3 style={styles.charName}>{char.name}</h3>
            <p style={styles.charTitle}>{char.title} &middot; {char.dynasty}</p>
            <p style={styles.charYears}>{char.years}</p>
            <p style={styles.charDesc}>{char.description}</p>
            {char.locked && <div style={styles.lockOverlay}>{"\u{1F512} \u656C\u8BF7\u671F\u5F85"}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function GameMap({ currentStage, stages, onLocationClick }) {
  const mapOutline = "M 120,80 L 200,60 280,50 360,40 440,55 500,40 560,50 620,70 680,90 700,130 720,170 710,210 690,250 700,290 680,330 650,360 620,380 580,390 560,410 520,420 480,400 440,380 400,400 370,420 340,400 300,380 260,400 230,380 200,360 180,340 160,300 140,260 120,220 110,180 100,140 110,100 Z";
  const activeLocation = LOCATIONS[currentStage.location];
  const visitedIds = stages.filter((s) => s.yearEnd <= currentStage.yearEnd).map((s) => s.location);

  return (
    <svg viewBox="0 0 800 500" style={styles.mapSvg}>
      <defs>
        <radialGradient id="mapGrad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#F5E6CA" />
          <stop offset="100%" stopColor="#D4B896" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={mapOutline} fill="url(#mapGrad)" stroke="#8B7355" strokeWidth="2" />

      {[150, 250, 350, 450, 550, 650].map((x) => (
        <line key={"vl" + x} x1={x} y1={40} x2={x} y2={420} stroke="#C4A882" strokeWidth="0.5" strokeDasharray="4,4" opacity={0.3} />
      ))}
      {[100, 175, 250, 325, 400].map((y) => (
        <line key={"hl" + y} x1={100} y1={y} x2={720} y2={y} stroke="#C4A882" strokeWidth="0.5" strokeDasharray="4,4" opacity={0.3} />
      ))}

      <path d="M 200,200 Q 300,180 400,220 Q 500,260 600,240 Q 680,220 720,260" fill="none" stroke="#5DADE2" strokeWidth="3" opacity={0.5} />
      <path d="M 480,180 Q 500,250 520,310 Q 540,370 560,420" fill="none" stroke="#5DADE2" strokeWidth="2" opacity={0.4} />

      {Object.entries(LOCATIONS).map(([id, loc]) => {
        const isActive = currentStage.location === id;
        const isVisited = visitedIds.includes(id);
        const stageForLoc = stages.find((s) => s.location === id);
        const x = (loc.x / 100) * 800;
        const y = (loc.y / 100) * 500;

        return (
          <g key={id} onClick={() => stageForLoc && onLocationClick(stageForLoc)} style={{ cursor: stageForLoc ? "pointer" : "default" }}>
            {isActive && (
              <circle cx={x} cy={y} r={20} fill={currentStage.color} opacity={0.2}>
                <animate attributeName="r" values="16;24;16" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={x} cy={y}
              r={isActive ? 10 : 7}
              fill={isActive ? currentStage.color : isVisited ? "#E67E22" : "#BDC3C7"}
              stroke="#FFF" strokeWidth="2"
              filter={isActive ? "url(#glow)" : undefined}
            />
            <text x={x} y={y - 15} textAnchor="middle" fill={isActive ? currentStage.color : "#5D4E37"} fontSize={isActive ? 14 : 12} fontWeight={isActive ? "bold" : "normal"} fontFamily="serif">
              {loc.name}
            </text>
          </g>
        );
      })}

      {activeLocation && (
        <text x={(activeLocation.x / 100) * 800} y={(activeLocation.y / 100) * 500 + 25} textAnchor="middle" fontSize={20}>
          {"\u{1F9D1}\u200D\u{1F393}"}
        </text>
      )}

      <text x={400} y={30} textAnchor="middle" fill="#5D4E37" fontSize={16} fontFamily="serif" fontWeight="bold">
        {"\u5927\u5510\u7586\u57DF\u56FE"}
      </text>
    </svg>
  );
}

function TimelineBar({ stages, currentIndex, onSelect, progress }) {
  return (
    <div style={styles.timelineContainer}>
      <div style={styles.timelineLine} />
      <div style={styles.timelineNodes}>
        {stages.map((stage, i) => {
          const isActive = i === currentIndex;
          const isCompleted = progress[stage.id]?.completed;
          const isAccessible = i <= currentIndex || isCompleted;
          return (
            <div key={stage.id} style={{ ...styles.timelineNode, cursor: isAccessible ? "pointer" : "default" }} onClick={() => isAccessible && onSelect(i)}>
              <div style={{
                ...styles.timelineDot,
                backgroundColor: isActive ? stage.color : isCompleted ? "#27AE60" : "#BDC3C7",
                transform: isActive ? "scale(1.3)" : "scale(1)",
                boxShadow: isActive ? ("0 0 12px " + stage.color) : "none",
              }}>
                {isCompleted && "\u2713"}
              </div>
              <div style={{ ...styles.timelineLabel, color: isActive ? stage.color : "#666", fontWeight: isActive ? "bold" : "normal" }}>
                {stage.period}
              </div>
              <div style={styles.timelineYear}>{stage.year}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventPanel({ stage, onStartQuiz, onClose }) {
  if (!stage) return null;
  const ev = stage.event;
  return (
    <div style={styles.eventOverlay} onClick={onClose}>
      <div style={styles.eventPanel} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>{"\u2715"}</button>
        <div style={{ ...styles.eventHeader, backgroundColor: stage.color }}>
          <h2 style={styles.eventTitle}>{ev.title}</h2>
          <span style={styles.eventYears}>{stage.year}</span>
        </div>
        <div style={styles.eventBody}>
          <p style={styles.narrative}>{ev.narrative}</p>
          <div style={styles.poemCard}>
            <h4 style={styles.poemTitle}>{"\u{1F4DC} " + ev.poem.title}</h4>
            <pre style={styles.poemContent}>{ev.poem.content}</pre>
          </div>
          <button style={{ ...styles.quizBtn, backgroundColor: stage.color }} onClick={onStartQuiz}>
            {"\u{1F3AF} \u5F00\u59CB\u7B54\u9898\u6311\u6218"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizPanel({ stage, onComplete, onClose }) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [fillInput, setFillInput] = useState("");
  const [isFinished, setIsFinished] = useState(false);

  const quizzes = stage.quiz;
  const current = quizzes[qIndex];

  const handleChoice = (idx) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === current.answer) setScore((s) => s + 1);
  };

  const handleFill = () => {
    if (showResult) return;
    setShowResult(true);
    if (fillInput.trim() === current.answer) setScore((s) => s + 1);
  };

  const handleOrder = () => {
    if (showResult) return;
    setShowResult(true);
    setScore((s) => s + 1);
  };

  const nextQuestion = () => {
    if (qIndex + 1 >= quizzes.length) {
      setIsFinished(true);
    } else {
      setQIndex(qIndex + 1);
      setSelected(null);
      setShowResult(false);
      setFillInput("");
    }
  };

  if (isFinished) {
    const passed = score >= Math.ceil(quizzes.length * 0.5);
    return (
      <div style={styles.eventOverlay} onClick={onClose}>
        <div style={styles.quizResultPanel} onClick={(e) => e.stopPropagation()}>
          <h2 style={{ margin: "0 0 16px", textAlign: "center" }}>
            {passed ? "\u{1F389} \u606D\u559C\u8FC7\u5173\uFF01" : "\u{1F4DA} \u7EE7\u7EED\u52A0\u6CB9\uFF01"}
          </h2>
          <div style={styles.scoreDisplay}>
            <span style={styles.scoreBig}>{score}/{quizzes.length}</span>
          </div>
          <p style={{ textAlign: "center", color: "#666", margin: "16px 0" }}>
            {passed ? ("\u4F60\u5DF2\u638C\u63E1\u300C" + stage.period + "\u300D\u7684\u5386\u53F2\u77E5\u8BC6\uFF01") : "\u518D\u56DE\u987E\u4E00\u4E0B\u8FD9\u6BB5\u5386\u53F2\u5427~"}
          </p>
          <button
            style={{ ...styles.quizBtn, backgroundColor: stage.color, width: "100%" }}
            onClick={() => { onComplete(passed); onClose(); }}
          >
            {passed ? "\u7EE7\u7EED\u65C5\u7A0B \u2192" : "\u5173\u95ED"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.eventOverlay} onClick={onClose}>
      <div style={styles.quizPanel} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>{"\u2715"}</button>
        <div style={styles.quizHeader}>
          <span style={{ ...styles.quizBadge, backgroundColor: stage.color }}>{stage.period}</span>
          <span style={styles.quizProgress}>{qIndex + 1} / {quizzes.length}</span>
        </div>

        <h3 style={styles.quizQuestion}>{current.question}</h3>

        {current.type === "choice" && (
          <div style={styles.optionsContainer}>
            {current.options.map((opt, i) => {
              let bg = "#F8F9FA";
              let border = "#DEE2E6";
              if (showResult) {
                if (i === current.answer) { bg = "#D4EDDA"; border = "#28A745"; }
                else if (i === selected && i !== current.answer) { bg = "#F8D7DA"; border = "#DC3545"; }
              } else if (i === selected) { bg = "#E3F2FD"; border = stage.color; }
              return (
                <div key={i} style={{ ...styles.optionBtn, backgroundColor: bg, borderColor: border }} onClick={() => handleChoice(i)}>
                  <span style={styles.optionLetter}>{["A", "B", "C", "D"][i]}</span>
                  {opt}
                </div>
              );
            })}
          </div>
        )}

        {current.type === "poem_fill" && (
          <div style={styles.fillContainer}>
            <input
              type="text"
              value={fillInput}
              onChange={(e) => setFillInput(e.target.value)}
              placeholder={"\u8BF7\u8F93\u5165\u7B54\u6848..."}
              style={{ ...styles.fillInput, borderColor: showResult ? (fillInput.trim() === current.answer ? "#28A745" : "#DC3545") : "#CCC" }}
              disabled={showResult}
              onKeyDown={(e) => e.key === "Enter" && handleFill()}
            />
            {!showResult && (
              <button style={{ ...styles.submitBtn, backgroundColor: stage.color }} onClick={handleFill}>
                {"\u786E\u8BA4"}
              </button>
            )}
            {showResult && fillInput.trim() !== current.answer && (
              <p style={{ color: "#28A745", marginTop: 8 }}>{"\u6B63\u786E\u7B54\u6848\uFF1A" + current.answer}</p>
            )}
          </div>
        )}

        {current.type === "order" && (
          <div style={styles.optionsContainer}>
            {current.items.map((item, i) => (
              <div key={i} style={{ ...styles.optionBtn, backgroundColor: "#F8F9FA", borderColor: "#DEE2E6" }} onClick={handleOrder}>
                <span style={styles.optionLetter}>{i + 1}</span>
                {item}
              </div>
            ))}
            {!showResult && <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{"\u70B9\u51FB\u4EFB\u610F\u9009\u9879\u67E5\u770B\u6B63\u786E\u987A\u5E8F"}</p>}
          </div>
        )}

        {showResult && (
          <div style={styles.explanation}>
            <strong>{"\u{1F4A1} \u89E3\u6790\uFF1A"}</strong>{current.explanation}
          </div>
        )}

        {showResult && (
          <button style={{ ...styles.quizBtn, backgroundColor: stage.color, width: "100%", marginTop: 12 }} onClick={nextQuestion}>
            {qIndex + 1 >= quizzes.length ? "\u67E5\u770B\u7ED3\u679C" : "\u4E0B\u4E00\u9898 \u2192"}
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ character, progress, totalStages }) {
  const completed = Object.values(progress).filter((p) => p.completed).length;
  const totalScore = Object.values(progress).reduce((sum, p) => sum + (p.score || 0), 0);
  return (
    <div style={styles.scoreBar}>
      <div style={styles.scoreBarLeft}>
        <span style={{ fontSize: 24 }}>{"\u{1F9D1}\u200D\u{1F393}"}</span>
        <span style={styles.scoreCharName}>{character.name}</span>
        <span style={styles.scoreCharTitle}>{character.title}</span>
      </div>
      <div style={styles.scoreBarRight}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>{"\u8FDB\u5EA6"}</span>
          <span style={styles.statValue}>{completed}/{totalStages}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>{"\u5F97\u5206"}</span>
          <span style={styles.statValue}>{totalScore}</span>
        </div>
        <div style={styles.progressBarOuter}>
          <div style={{ ...styles.progressBarInner, width: ((completed / totalStages) * 100) + "%", backgroundColor: character.color }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function HistoryGame() {
  const [screen, setScreen] = useState("select");
  const [character, setCharacter] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEvent, setShowEvent] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [progress, setProgress] = useState({});

  const handleSelectCharacter = (char) => {
    setCharacter(char);
    setScreen("game");
    setCurrentIndex(0);
    setProgress({});
    setTimeout(() => setShowEvent(true), 500);
  };

  const handleLocationClick = (stage) => {
    const idx = TIMELINE.findIndex((s) => s.id === stage.id);
    if (idx >= 0) { setCurrentIndex(idx); setShowEvent(true); }
  };

  const handleQuizComplete = (passed) => {
    const stage = TIMELINE[currentIndex];
    setProgress((prev) => ({
      ...prev,
      [stage.id]: { completed: passed, score: (prev[stage.id]?.score || 0) + (passed ? stage.quiz.length : 0) },
    }));
    if (passed && currentIndex < TIMELINE.length - 1) {
      setTimeout(() => { setCurrentIndex(currentIndex + 1); setTimeout(() => setShowEvent(true), 400); }, 300);
    }
  };

  if (screen === "select") {
    return <CharacterSelect onSelect={handleSelectCharacter} />;
  }

  const currentStage = TIMELINE[currentIndex];

  return (
    <div style={styles.gameContainer}>
      <ScoreBar character={character} progress={progress} totalStages={TIMELINE.length} />
      <div style={styles.mapContainer}>
        <GameMap currentStage={currentStage} stages={TIMELINE} onLocationClick={handleLocationClick} />
        <div style={{ ...styles.floatingInfo, borderLeftColor: currentStage.color }}>
          <h3 style={{ margin: "0 0 4px", color: currentStage.color }}>{currentStage.period}</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{currentStage.summary}</p>
          <button style={{ ...styles.exploreBtn, backgroundColor: currentStage.color }} onClick={() => setShowEvent(true)}>
            {"\u{1F4D6} \u63A2\u7D22\u6B64\u65F6\u671F"}
          </button>
        </div>
      </div>
      <TimelineBar stages={TIMELINE} currentIndex={currentIndex} onSelect={setCurrentIndex} progress={progress} />
      <button style={styles.backBtn} onClick={() => { setScreen("select"); setCharacter(null); }}>
        {"\u2190 \u8FD4\u56DE\u9009\u62E9"}
      </button>
      {showEvent && !showQuiz && (
        <EventPanel stage={currentStage} onStartQuiz={() => { setShowEvent(false); setShowQuiz(true); }} onClose={() => setShowEvent(false)} />
      )}
      {showQuiz && (
        <QuizPanel stage={currentStage} onComplete={handleQuizComplete} onClose={() => setShowQuiz(false)} />
      )}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  selectScreen: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
  mainTitle: {
    fontSize: 48,
    color: "#F4D03F",
    letterSpacing: 16,
    marginBottom: 8,
    textShadow: "0 0 20px rgba(244,208,63,0.3)",
  },
  subtitle: { color: "#AAB7C4", fontSize: 16, marginBottom: 40, letterSpacing: 4 },
  characterGrid: { display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" },
  characterCard: {
    width: 220,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    border: "2px solid",
    padding: 24,
    textAlign: "center",
    transition: "all 0.3s",
    position: "relative",
    backdropFilter: "blur(10px)",
  },
  charAvatar: {
    width: 80, height: 80, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 12px",
  },
  charName: { color: "#FFF", fontSize: 22, margin: "0 0 4px", letterSpacing: 4 },
  charTitle: { color: "#AAB7C4", fontSize: 13, margin: "0 0 4px" },
  charYears: { color: "#888", fontSize: 12, margin: "0 0 8px" },
  charDesc: { color: "#CCC", fontSize: 13, lineHeight: 1.5 },
  lockOverlay: {
    position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FFF", fontSize: 18, letterSpacing: 2,
  },
  gameContainer: {
    minHeight: "100vh", backgroundColor: "#F5F0E8",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    display: "flex", flexDirection: "column", position: "relative",
  },
  scoreBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 20px", backgroundColor: "#FFF",
    borderBottom: "1px solid #E8E0D0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  scoreBarLeft: { display: "flex", alignItems: "center", gap: 10 },
  scoreCharName: { fontSize: 18, fontWeight: "bold", color: "#333" },
  scoreCharTitle: { fontSize: 13, color: "#999", backgroundColor: "#F0EBE0", padding: "2px 8px", borderRadius: 4 },
  scoreBarRight: { display: "flex", alignItems: "center", gap: 16 },
  statItem: { display: "flex", flexDirection: "column", alignItems: "center" },
  statLabel: { fontSize: 11, color: "#999" },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#333" },
  progressBarOuter: { width: 120, height: 8, backgroundColor: "#E8E0D0", borderRadius: 4, overflow: "hidden" },
  progressBarInner: { height: "100%", borderRadius: 4, transition: "width 0.5s ease" },
  mapContainer: {
    flex: 1, position: "relative", display: "flex",
    alignItems: "center", justifyContent: "center",
    padding: "10px 20px", minHeight: 400,
  },
  mapSvg: {
    width: "100%", maxWidth: 800, height: "auto",
    borderRadius: 12, border: "2px solid #C4A882",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)", backgroundColor: "#EDE4D3",
  },
  floatingInfo: {
    position: "absolute", bottom: 20, right: 20, width: 280,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12,
    padding: 16, borderLeft: "4px solid",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  exploreBtn: {
    marginTop: 8, padding: "6px 16px", color: "#FFF",
    border: "none", borderRadius: 6, cursor: "pointer",
    fontSize: 13, fontFamily: "inherit",
  },
  timelineContainer: {
    position: "relative", padding: "16px 40px 24px",
    backgroundColor: "#FFF", borderTop: "1px solid #E8E0D0",
  },
  timelineLine: {
    position: "absolute", top: 28, left: 60, right: 60,
    height: 3, backgroundColor: "#E8E0D0", borderRadius: 2,
  },
  timelineNodes: { display: "flex", justifyContent: "space-between", position: "relative" },
  timelineNode: { display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 },
  timelineDot: {
    width: 28, height: 28, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FFF", fontSize: 12, fontWeight: "bold",
    transition: "all 0.3s", border: "3px solid #FFF",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  timelineLabel: { marginTop: 6, fontSize: 12, whiteSpace: "nowrap", transition: "all 0.3s" },
  timelineYear: { fontSize: 10, color: "#AAA", marginTop: 2 },
  eventOverlay: {
    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 20,
  },
  eventPanel: {
    width: "100%", maxWidth: 560, maxHeight: "85vh",
    backgroundColor: "#FFF", borderRadius: 16,
    overflow: "hidden", position: "relative", overflowY: "auto",
  },
  closeBtn: {
    position: "absolute", top: 12, right: 12, width: 32, height: 32,
    borderRadius: "50%", border: "none", backgroundColor: "rgba(255,255,255,0.9)",
    fontSize: 16, cursor: "pointer", zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  eventHeader: { padding: "24px 24px 16px", color: "#FFF" },
  eventTitle: { margin: 0, fontSize: 24, letterSpacing: 4 },
  eventYears: { fontSize: 14, opacity: 0.8 },
  eventBody: { padding: 24 },
  narrative: { fontSize: 15, lineHeight: 1.8, color: "#444", marginBottom: 20, textIndent: "2em" },
  poemCard: {
    backgroundColor: "#FDF8F0", borderRadius: 12, padding: 20,
    marginBottom: 20, border: "1px solid #E8DCC8",
  },
  poemTitle: { margin: "0 0 12px", color: "#8B6914", fontSize: 15 },
  poemContent: {
    margin: 0, fontSize: 16, lineHeight: 2, color: "#5D4E37",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    whiteSpace: "pre-wrap", textAlign: "center",
  },
  quizBtn: {
    padding: "10px 24px", color: "#FFF", border: "none",
    borderRadius: 8, cursor: "pointer", fontSize: 15,
    fontFamily: "inherit", letterSpacing: 2,
    display: "block", margin: "0 auto",
  },
  quizPanel: {
    width: "100%", maxWidth: 500, backgroundColor: "#FFF",
    borderRadius: 16, padding: 24, position: "relative",
    maxHeight: "85vh", overflowY: "auto",
  },
  quizResultPanel: {
    width: "100%", maxWidth: 400, backgroundColor: "#FFF",
    borderRadius: 16, padding: 32, position: "relative",
  },
  quizHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  quizBadge: { color: "#FFF", padding: "4px 12px", borderRadius: 12, fontSize: 12 },
  quizProgress: { color: "#999", fontSize: 13 },
  quizQuestion: { fontSize: 17, lineHeight: 1.6, color: "#333", marginBottom: 16, whiteSpace: "pre-wrap" },
  optionsContainer: { display: "flex", flexDirection: "column", gap: 10 },
  optionBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", borderRadius: 10, border: "2px solid",
    cursor: "pointer", fontSize: 14, transition: "all 0.2s", fontFamily: "inherit",
  },
  optionLetter: {
    width: 28, height: 28, borderRadius: "50%", backgroundColor: "#E8E0D0",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: "bold", flexShrink: 0,
  },
  fillContainer: { display: "flex", flexDirection: "column", gap: 8 },
  fillInput: {
    padding: "12px 16px", fontSize: 16, borderRadius: 10,
    border: "2px solid", fontFamily: "inherit", outline: "none", textAlign: "center",
  },
  submitBtn: {
    padding: "10px", color: "#FFF", border: "none",
    borderRadius: 8, cursor: "pointer", fontSize: 15, fontFamily: "inherit",
  },
  explanation: {
    marginTop: 16, padding: 12, backgroundColor: "#FFF8E1",
    borderRadius: 8, fontSize: 13, lineHeight: 1.6,
    color: "#666", border: "1px solid #FFE082",
  },
  scoreDisplay: { textAlign: "center", padding: 20 },
  scoreBig: { fontSize: 48, fontWeight: "bold", color: "#333" },
  backBtn: {
    position: "absolute", top: 10, left: 10, padding: "6px 12px",
    backgroundColor: "transparent", border: "1px solid #CCC",
    borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#666",
    fontFamily: "inherit", zIndex: 5,
  },
};
