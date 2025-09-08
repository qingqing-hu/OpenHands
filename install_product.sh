#!/bin/sh

#可修改，函数名勿改
#设置LANG变量，根据程序实际使用的编码修改
setLANG()
{
	#LANG=zh_CN.GB2312
        LANG=en_US.UTF-8
	echo $LANG
}

mysync()
{
        echo "rsync -rvcb --suffix=.bak  $1 $2 2>&1"
        ##exclude-dir exclude-file
        rsyncRes=$(rsync -rvcb --suffix=.bak --exclude-from "$3" $1 $2 2>&1)
        sleep 5s
}

#可修改，函数名勿改
#程序安装步骤，需接入方实现，也可以调用自己需要的脚本
#需判断是否安装成功，如果成功，请给flg赋值0：flg=0；若失败则不需要赋值。flg用于将执行结果上报给发布平台。
installProduct()
{
	# TODO：程序安装在此实现
	# 安装成功需给flg赋值0！很重要！
	#flg=0
       tmp_code_jar="/puppet_data/puppet/cbas-openhands"
       home_cbas="/home/cbas/"
       code_path="/home/cbas/cbas-openhands"

       bak_dir=/tmp/bak_`date +%Y%m%d%H%M%S`
       if [ -d "/home/cbas/cbas-openhands" ];then
          bak_dir=/tmp/cbas-openhands_bak_`date +%Y%m%d%H%M%S`
          mv /home/cbas/cbas-openhands ${bak_dir}
       fi

       cp -r ${tmp_code_jar} ${home_cbas}
       cp -r /home/cbas/openhands-offline-packages/offline-packages /home/cbas/cbas-openhands/containers/app

       chmod -R 777  ${code_path}
       cd ${code_path}
       sh docker-deploy.sh --down
       sleep 15
       sh docker-deploy.sh --up >/tmp/openhands_up.log 2>&1
       flg=0
}


#请勿修改！！！！
#根据installProduct中的flg，判断本次安装成功还是失败，并将结果上报给发布平台。
reportResult()
{
	taskid=$2
	server=`grep 'server=' /etc/puppet/puppet.conf  | awk -F '=' '{print $2}'`
	if [[ $1 -ne 0 ]];then
		if [[ -n "$taskid" ]];then
			result=$(curl http://"${server}":8080/interface/leaf_changeStatus.php -d " taskid=${taskid}&issuccess=3")
		else
			echo "the taskid is empty, does not report result"
		fi
		echo "install failure"
	else
		if [[ -n "$taskid" ]];then
			result=$(curl http://"${server}":8080/interface/leaf_changeStatus.php -d " taskid=${taskid}&issuccess=2")
		else
			echo "the taskid is empty, does not report result"
		fi
		echo "install success"
	fi

	echo $result
	sleep 2s
}

#################################################################
#            以下步骤请勿修改！！！！                           #
#            步骤一：设置LANG变量                               #
#            步骤二：installProduct执行结果标志：1失败，0成功   #
#            步骤三：执行installProduct                         #
#            步骤四：将安装结果上报给发布平台                   #
#################################################################
echo "-----Begin install  $(date "+%Y-%m-%d %H:%M:%S")-------"
setLANG
flg=1
installProduct
echo "-----End install  $(date "+%Y-%m-%d %H:%M:%S")-------"

exit 0

