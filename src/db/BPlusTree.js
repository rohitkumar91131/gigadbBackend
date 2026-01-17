class Node{
    constructor(isLeaf ){
        this.isLeaf = isLeaf;
        this.children = [];
        this.keys = [];
        this.next = null
    }
}

class BPlusTree{
    constructor(order){
        this.root = new Node(true);
        this.order = order;
    }

    insert(key , value){
        const node = this.root;
        const result = this._insert(node , key , value);
        if(!result) return;
        const newRoot = new Node(false);
        newRoot.keys = [result.upKey];
        newRoot.children.push(node , result.right);
        this.root = newRoot
    }

    _insert(node , key , value){
        if(node.isLeaf){
            node.keys.push({ key, value });
            node.keys.sort((a , b) => a.key - b.key);
            if(node.keys.length <this.order) return;
            const mid = Math.floor(this.order/2);
            const right = new Node(true);
            right.keys = node.keys.splice(mid);
            right.next = node.next;
            node.next = right;
            return { upKey : right.keys[0].key , right};
        }

        let idx = node.keys.findIndex(k =>  key < k);
        if (idx === -1 ) idx = node.keys.length;
        const result = this._insert(node.children[idx] , key , value);
        if(!result) return;
        node.keys.splice(idx  , 0 , result.upKey );
        node.children.splice(idx +1 , 0 , result.right);
        if(node.keys.length < this.order ) return;
        const mid = Math.floor(this.order/2);
        const right = new Node(false);
        const upkey = node.keys[mid];
        right.keys = node.keys.splice(mid+1);
        node.keys.pop();
        right.children = node.children.splice(mid+1);
        return { upKey : upkey  , right}
    }

    updateValue(key, newValue) {
    const leaf = this.findLeaf(this.root, key);
    if (!leaf) return false;

    for (let i = 0; i < leaf.keys.length; i++) {
        if (leaf.keys[i].key === key) {
            leaf.keys[i].value = newValue;
            return true;
        }
    }

    return false;
    }



    insertMulti(key , value){
        const leaf = this.findLeaf(this.root , key);

        for( let i = 0 ; i < leaf.keys.length ; i++ ){
            if( leaf.keys[i].key === key ){
                leaf.keys[i].value.push(value);
                return;
            }   
        }

        this.insert(key , [value]); 

    }

    findLeaf(node , key){
        if(node.isLeaf) return node;
        let idx = node.keys.findIndex(k => key < k );
        if(idx === -1 ) idx = node.keys.length;
        return this.findLeaf(node.children[idx] , key); 
    } 

    findAllValues(key){
        const leaf = this.findLeaf(this.root , key);

        if(!leaf) return null;

        for(let i = 0 ; i < leaf.keys.length ; i++){
            if(leaf.keys[i].key === key){
                return leaf.keys[i].value;
            }
        }
    }

    checkValueInAMultiValueKey(key , value){
        const leaf = this.findLeaf(this.root , key);
        if(!leaf) return null;
        for(const entry of leaf.keys){
            if(entry.key === key){
                for( const val of entry.value){
                    if(val === value){
                        return true;
                    }
                }
            }

        }
        return false;
    }

    find(key){
        return this._find(this.root , key);
    }

    _find(node , key){
        if(node.isLeaf){
            const result = node.keys.find(k => k.key === key);
            if(!result) return null;
            return result.value
        }
        let idx = node.keys.findIndex(k => key < k);
        if(idx === -1 ) idx = node.keys.length;
        return this._find(node.children[idx] , key)
    }

    delete(key){
        this._delete(this.root , key , null)
        if(!this.root.isLeaf && this.root.children.length===1){
            this.root = this.root.children[0]
        }
    }

    _delete(node , key , parent){
        if(node.isLeaf){
            const i = node.keys.findIndex(k => k.key===key)
            if(i===-1) return
            node.keys.splice(i,1)
            if(node===this.root) return
            this._fix(node , parent)
            return
        }
        let idx = node.keys.findIndex(k => key < k)
        if(idx===-1) idx = node.keys.length
        this._delete(node.children[idx],key,node)
    }

    _fix(node,parent){
        const min = Math.ceil((this.order-1)/2)
        if(node.keys.length>=min) return
        const idx = parent.children.indexOf(node)
        const left = idx>0 ? parent.children[idx-1] : null
        const right = idx<parent.children.length-1 ? parent.children[idx+1] : null

        if(left && left.keys.length>min){
            if(node.isLeaf){
                node.keys.unshift(left.keys.pop())
                parent.keys[idx-1]=node.keys[0].key
            }else{
                node.keys.unshift(parent.keys[idx-1])
                parent.keys[idx-1]=left.keys.pop()
                node.children.unshift(left.children.pop())
            }
            return
        }

        if(right && right.keys.length>min){
            if(node.isLeaf){
                node.keys.push(right.keys.shift())
                parent.keys[idx]=right.keys[0].key
            }else{
                node.keys.push(parent.keys[idx])
                parent.keys[idx]=right.keys.shift()
                node.children.push(right.children.shift())
            }
            return
        }

        if(left){
            if(node.isLeaf){
                left.keys = left.keys.concat(node.keys)
                left.next = node.next
            }else{
                left.keys.push(parent.keys[idx-1])
                left.keys = left.keys.concat(node.keys)
                left.children = left.children.concat(node.children)
            }
            parent.keys.splice(idx-1,1)
            parent.children.splice(idx,1)
        }else if(right){
            if(node.isLeaf){
                node.keys = node.keys.concat(right.keys)
                node.next = right.next
            }else{
                node.keys.push(parent.keys[idx])
                node.keys = node.keys.concat(right.keys)
                node.children = node.children.concat(right.children)
            }
            parent.keys.splice(idx,1)
            parent.children.splice(idx+1,1)
        }

        if(parent===this.root && parent.keys.length===0){
            this.root = parent.children[0]
            return
        }

        const p = this._findParent(this.root,parent)
        if(p) this._fix(parent,p)
    }

    _findParent(curr,child){
        if(curr.isLeaf) return null
        for(const c of curr.children){
            if(c===child) return curr
            const p = this._findParent(c,child)
            if(p) return p
        }
        return null
    }

    getFirstLeaf(){
        let currentNode = this.root;
        while(!currentNode.isLeaf){
            currentNode = currentNode.children[0];
        }

        return currentNode;
    }

    findValuesByPage(pageNumber = 1, pageSize = 10) {

        if (pageNumber < 1 || pageSize < 1) return []

        const skip = (pageNumber - 1) * pageSize

        let leaf = this.getFirstLeaf()
        if (!leaf) return []

        let index = 0
        let results = []

        while (leaf) {
            for (let i = 0; i < leaf.keys.length; i++) {
                if (index >= skip && results.length < pageSize) {
                    results.push(leaf.keys[i])
                }
                index++
                if (results.length === pageSize) return results
            }
            leaf = leaf.next
        }

        return results
    }



}

module.exports = BPlusTree