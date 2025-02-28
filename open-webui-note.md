# Open-WebUI 开发笔记

- [x] 先通读项目文档，了解项目功能和特性
- [x] 再通读源代码，了解功能具体实现
- [ ] 集成`open-webui`到github-pages，或者放到一个单独的页面
- [ ] 然后，尝试内置的`function`功能
- [ ] 再用`pipeline`-docker添加复杂的插件系统
- [ ] 最后，fork一个自己的`open-webui`，修改源代码，尝试提交PR

## backend

### 001_initial_schema.py

- `from contextlib import suppress`：`suppress`是**上下文管理器**，用于抑制指定的异常
  - `with suppress(FileNotFoundError): os.remove('somefile')`：如果文件不存在，不会抛出异常
  - 示例：`db.py`用到了`get_db = contextmanager(get_session)`：**`contextmanager`装饰器用于将生成器函数`get_session`转换为上下文管理器**
- `peewee`：小巧但功能强大的 Python ORM（对象关系映射）库，利用python类和对象来操作数据库
  - `playhouse`：peewee的插件，提供额外数据库支持

- 函数：
  - `rollback`：将数据库模式恢复到迁移之前的状态，通过删除迁移过程中创建的所有表。可选参数：`fake=false`，指示是否执行“假”回滚（即不实际执行数据库更改）
  - `migrate`：数据库模型定义：使用 peewee 库定义了数据库模式迁移。由于 SQLite 数据库对模式的强制执行较为宽松，代码区分了 SQLite 数据库和其他外部数据库。
- `try-yield-finally`结构：
  - 常用于资源管理/生成器环境
  - `yield`：生成对象，返回给调用者，并暂停当前函数执行
  - `finally`：无论`try`块是否发生异常，都会执行`finally`块中的代码，避免资源泄漏

### 002_add_local_sharing.py

- 数据库增量更新，例如添加新的字段或索引。

### db.py

- 数据库的初始化和连接管理
- `def process_bind_param(self, value: Optional[_T], dialect: Dialect) -> Any:`
  - `value: Optional[_T]`：可选参数，类型为`_T`或者`None`
  - `dialect: Dialect`：SQLAlchemy的方言对象，用于处理不同数据库的差异
  - `-> Any`：返回值类型为`Any`，即任意类型

#### [`json`库](https://docs.python.org/3/library/json.html)

`json` 库是 Python 内置的标准库，用于处理 JSON（JavaScript Object Notation）数据。JSON 是一种轻量级的数据交换格式，易于人阅读和编写，也易于机器解析和生成。

**主要功能：**

- **序列化（Serialization）/ 编码（Encoding）**:  将 Python 对象转换为 JSON 字符串。
- **反序列化（Deserialization）/ 解码（Decoding）**:  将 JSON 字符串转换为 Python 对象。

**常用函数：**

- **`json.dumps(obj, *, skipkeys=False, ensure_ascii=True, check_circular=True, allow_nan=True, cls=None, indent=None, separators=None, default=None, sort_keys=False, **kw)`**:  将 Python 对象 `obj` 序列化为 JSON 字符串。
  - `skipkeys`:  如果为 `True`，则跳过不是基本类型（str, int, float, bool, None）的字典键，否则引发 `TypeError`。
  - `ensure_ascii`:  如果为 `True`，则所有非 ASCII 字符都将被转义。
  - `check_circular`:  如果为 `True`，则检查循环引用。
  - `allow_nan`:  如果为 `True`，则允许 `NaN`、`Infinity` 和 `-Infinity` 作为有效的 JSON 值。
  - `indent`:  如果为非负整数，则 JSON 字符串将以更易读的方式格式化，缩进指定的空格数。
  - `separators`:  指定分隔符，默认为 `(',', ': ')`。
  - `sort_keys`:  如果为 `True`，则对字典的键进行排序。
- **`json.loads(s, *, cls=None, object_hook=None, parse_float=None, parse_int=None, parse_constant=None, object_pairs_hook=None, **kw)`**:  将 JSON 字符串 `s` 反序列化为 Python 对象。
  - `object_hook`:  一个可选的函数，用于自定义对象解码。
  - `parse_float`:  一个可选的函数，用于自定义浮点数解码。
  - `parse_int`:  一个可选的函数，用于自定义整数解码。
  - `parse_constant`:  一个可选的函数，用于自定义常量解码。

**Python 对象与 JSON 类型的对应关系：**

| Python        | JSON          |
| ------------- | ------------- |
| dict          | object        |
| list, tuple   | array         |
| str           | string        |
| int, float    | number        |
| True          | true          |
| False         | false         |
| None          | null          |

**示例：**

```python
import json

# 序列化
data = {
    "name": "Alice",
    "age": 30,
    "city": "New York"
}
json_string = json.dumps(data, indent=4)
print(json_string)
# Output:
# {
#     "name": "Alice",
#     "age": 30,
#     "city": "New York"
# }

# 反序列化
json_string = '{"name": "Bob", "age": 25, "city": "Los Angeles"}'
data = json.loads(json_string)
print(data)
# Output: {'name': 'Bob', 'age': 25, 'city': 'Los Angeles'}
```

在你的代码中，`JSONField` 类使用 `json.dumps` 和 `json.loads` 函数来实现 Python 对象和 JSON 字符串之间的转换，以便将 JSON 数据存储到数据库中。

#### 线程、连接池、会话管理

**线程**：
线程是操作系统能够进行运算调度的最小单位。它被包含在进程之中，是进程中的实际运作单位。一个进程可以包含多个线程，这些线程共享进程的资源，但可以独立执行。

**连接池**：
连接池是一种用于管理数据库连接的技术。它维护着一组数据库连接，这些连接可以被重复使用，而不是每次需要数据库连接时都创建一个新的连接。连接池的优点包括：

- 提高性能：减少了创建和销毁连接的开销。
- 控制资源：限制了同时打开的连接数量，防止资源耗尽。

`QueuePool` 和 `NullPool` 是 SQLAlchemy 提供的两种连接池实现：

- `QueuePool`：这是默认的连接池实现，使用队列来管理连接。
- `NullPool`：不使用连接池，每次请求都会创建一个新的连接。

**SQLite**：轻量、无服务器、多线程限制的嵌入式数据库。

**其他数据库（如 MySQL、PostgreSQL）**：客户端-服务器架构的数据库系统，支持高并发访问和复杂的事务。

### wrappers.py

- `from contextvars import ContextVar`: 创建上下文变量，实现线程或请求级别的状态隔离
- **混入类（mixin）**：允许类通过继承多个类来组合行为，而不是通过单一继承链。
  - `class ReconnectingPostgresqlDatabase(CustomReconnectMixin, PostgresqlDatabase): pass`：多重继承

```python
# ContextVar 提供了一种线程安全的方式来存储状态。 PeeweeConnectionState 类则提供了一个方便的接口，用于访问和修改存储在 ContextVar 中的状态
class PeeweeConnectionState(object):
    def __init__(self, **kwargs): # **kwargs：允许在创建类的实例时传递任意数量的关键字参数，收集到字典中
        # 调用父类的__setattr__方法，将 db_state (一个 ContextVar 实例) 赋值给实例的一个特殊属性 _state
        # 必须调用父类的__setattr__方法，否则会导致无限递归
        super().__setattr__("_state", db_state) 
        super().__init__(**kwargs)

    def __setattr__(self, name, value): # 拦截对实例属性的赋值操作
        # 设置 db_state 字典中键为 name 的值为 value
        self._state.get()[name] = value # self._state: 访问之前在 __init__ 方法中设置的 _state 属性，它存储了 db_state 这个 ContextVar 实例。

    def __getattr__(self, name):
        value = self._state.get()[name]
        return value
```

### migrations目录

- Alembic 自动生成数据库迁移脚本的目录

## retrieval(数据提取)

### loaders

#### main.py

- `Tika`：Apache Tika 是一个内容分析工具包，可以从各种文档中检测和提取**内容、元数据**和结构化文本内容。
  - 其他功能：检测语言、内容类型检测
  - 应用：搜索引擎、内容分析与合规性判断、数据挖掘、自然语言处理等
- 自定义加载器选择，包括各种文档和YouTube视频

#### YouTube.py

- 示例url结构: <https://www.youtube.com/watch?v=abxrMwdeQqI>
- 设置了
  - `ALLOWED_SCHEMES`：允许的URL协议
  - `ALLOWED_NETLOCS`：允许的URL域名
- `parsed_url = urlparse(url)`中使用了`urllib.parse`中的`urlparse`

```python
    if path.endswith("/watch"):
        query = parsed_url.query
        parsed_query = parse_qs(query)
        if "v" in parsed_query:
            ids = parsed_query["v"]
            video_id = ids if isinstance(ids, str) else ids[0]
        else:
            return None
    else:
        path = parsed_url.path.lstrip("/")
        video_id = path.split("/")[-1]

    if len(video_id) != 11:  # Video IDs are 11 characters long
        return None
```

- 字幕转录：
  - `map` 函数会对 `transcript_pieces` 列表中的每个元素应用 lambda 表达式，并返回一个新的迭代器。
  - `lamada`：返回`transcript_piece`片段(类型：字典)的 text 属性去除两端空格后的结果

```python
# 将字幕列表转换为字符串
transcript = " ".join( 
    map(
        lambda transcript_piece: transcript_piece["text"].strip(" "),
        transcript_pieces,
    )
)
```

### models

#### colvert.py

- **ColBERT (Contextualized Late Interaction over BERT) 模型**：文档检索。

### vector

### chroma.py

- [Chroma - the open-source embedding database](https://github.com/chroma-core/chroma)
  - 