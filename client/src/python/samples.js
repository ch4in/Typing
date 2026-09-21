// 给六年级同学准备的示例程序，点一下就能放进编辑器里运行
export const SAMPLES = [
  {
    name: '第一个程序.py',
    emoji: '👋',
    desc: '认识 print：让电脑说话',
    code: '# 我的第一个 Python 程序\nprint("你好，Python！")\nprint("1 + 1 =", 1 + 1)\nprint("今天也要开心呀 😊")\n',
  },
  {
    name: '问好机器人.py',
    emoji: '🤖',
    desc: 'input 输入 + 字符串拼接',
    code: 'name = input("你叫什么名字？")\nprint("你好呀，" + name + "！")\n\nage = int(input("你今年几岁？"))\nprint("哇，你明年就", age + 1, "岁啦！")\n',
  },
  {
    name: '猜数字.py',
    emoji: '🎯',
    desc: '随机数 + 循环 + 判断',
    code: 'import random\n\nsecret = random.randint(1, 100)\nprint("我想好了一个 1~100 的数，你有 5 次机会～")\n\nfor i in range(5):\n    guess = int(input("第" + str(i + 1) + "次猜："))\n    if guess == secret:\n        print("猜对啦！用了", i + 1, "次 🎉")\n        break\n    elif guess < secret:\n        print("太小了")\n    else:\n        print("太大了")\n\nprint("答案是", secret)\n',
  },
  {
    name: '九九乘法表.py',
    emoji: '✖️',
    desc: '双层 for 循环',
    code: 'for i in range(1, 10):\n    for j in range(1, i + 1):\n        print(f"{j}×{i}={i * j}", end="  ")\n    print()   # 换一行\n',
  },
  {
    name: '画星星.py',
    emoji: '⭐',
    desc: '用 * 画一个等腰三角形',
    code: 'n = 5\nfor i in range(1, n + 1):\n    print(" " * (n - i) + "*" * (2 * i - 1))\n\nprint("看，一座小山！")\n',
  },
  {
    name: '成绩等级.py',
    emoji: '📊',
    desc: 'if / elif / else 判断',
    code: 'score = float(input("请输入你的分数："))\n\nif score >= 90:\n    print("优秀！🌟")\nelif score >= 75:\n    print("良好！👍")\nelif score >= 60:\n    print("及格，继续加油！")\nelse:\n    print("别灰心，我们再练一次 💪")\n',
  },
  {
    name: '长方形面积.py',
    emoji: '📐',
    desc: '自己写函数 def',
    code: 'def area(width, height):\n    return width * height\n\nw = float(input("长方形的宽："))\nh = float(input("长方形的高："))\n\nprint("面积是", area(w, h))\nprint("周长是", (w + h) * 2)\n',
  },
  {
    name: '故意写错.py',
    emoji: '😵',
    desc: '运行看看中文报错提示长什么样',
    code: '# 这一行是对的\nprint("开始运行啦")\n\n# 这一行故意写错：除以 0\nprint(10 / 0)\n',
  },
];

// 「❓ 小抄」里的内容：最常用的几个语法
export const CHEATS = [
  { k: 'print("你好")', v: '在屏幕上显示一句话' },
  { k: 'name = input("你叫什么？")', v: '问一个问题，把答案存进变量（拿到的是文字）' },
  { k: 'n = int(input("数字："))', v: '把输入的文字变成整数，才能做加减乘除' },
  { k: 'n = float(input("小数："))', v: '变成小数（带小数点）' },
  { k: 'if score >= 60:', v: '如果……就……（行尾要有冒号，下一行缩进 4 格）' },
  { k: 'else: / elif:', v: '否则 / 否则如果' },
  { k: 'for i in range(5):', v: '重复 5 次，i 依次是 0、1、2、3、4' },
  { k: 'while 条件:', v: '只要条件成立就一直重复（记得让条件会变，不然停不下来）' },
  { k: 'def 名字(参数):', v: '定义一个函数，用 return 把结果送回来' },
  { k: 'import random', v: '随机：random.randint(1, 10) 取 1~10 的整数' },
  { k: 'len(列表)', v: '数一数有几个元素' },
  { k: 'print(f"我 {age} 岁")', v: 'f 字符串：把变量塞进一句话里' },
];
